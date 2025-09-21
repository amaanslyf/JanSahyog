// src/services/notificationService.js - FIXED INFINITE INITIALIZATION
import * as Notifications from 'expo-notifications';
import { doc, updateDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { registerForPushNotificationsAsync } from '../hooks/useFirebase';

class NotificationService {
    constructor(db, auth) {
        this.db = db;
        this.auth = auth;
        this.notificationListener = null;
        this.responseListener = null;
        this.badgeCountUnsubscribe = null;
        this.badgeCount = 0;
        
        // ✅ FIX: Add initialization tracking
        this.isInitialized = false;
        this.isInitializing = false;
        
        // ✅ FIX: Track user for cleanup
        this.currentUserId = null;
    }

    // Initialize push notifications for the current user
    async initialize() {
        // ✅ FIX: Prevent duplicate initialization
        if (this.isInitialized) {
            console.log('⚠️ NotificationService already initialized, skipping...');
            return;
        }

        if (this.isInitializing) {
            console.log('⚠️ NotificationService initialization already in progress, skipping...');
            return;
        }

        try {
            this.isInitializing = true;
            console.log('🔄 Initializing NotificationService...');
            
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No authenticated user found');
            }

            this.currentUserId = user.uid;
            
            // Register for push notifications and get REAL token
            const token = await registerForPushNotificationsAsync();
            
            if (token) {
                // Save real token to user's profile in Firestore
                await this.saveTokenToDatabase(token);
                console.log('✅ Push token saved to database');
            } else {
                console.log('⚠️ No token available - permissions may be denied');
            }

            // Setup notification listeners (only if not already set up)
            this.setupNotificationListeners();

            // Load initial badge count (only if not already set up)
            await this.updateBadgeCount();

            this.isInitialized = true;
            console.log('✅ NotificationService initialized successfully');
            return token;
        } catch (error) {
            console.error('❌ Error initializing notifications:', error);
            this.isInitialized = false;
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    // Save push token to user's profile with enhanced data
    async saveTokenToDatabase(token) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                console.log('⚠️ No current user to save token for');
                return;
            }

            const userRef = doc(this.db, 'users', user.uid);
            await updateDoc(userRef, {
                pushToken: token,
                lastTokenUpdate: serverTimestamp(),
                notificationsEnabled: true,
                deviceInfo: {
                    platform: 'mobile',
                    tokenType: token.includes('ExponentPushToken') ? 'expo' : 'other',
                    lastUpdated: serverTimestamp()
                }
            });

            console.log('✅ Push token saved successfully:', token.substring(0, 20) + '...');
        } catch (error) {
            console.error('❌ Error saving push token:', error);
            throw error;
        }
    }

    // Setup comprehensive notification listeners
    setupNotificationListeners() {
        // ✅ FIX: Prevent duplicate listeners
        if (this.notificationListener || this.responseListener) {
            console.log('⚠️ Notification listeners already set up, skipping...');
            return;
        }

        console.log('🔗 Setting up notification listeners...');

        // Listen for notifications received while app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('🔔 Foreground notification received:', notification.request.content.title);
            this.handleNotificationReceived(notification);
        });

        // Listen for user tapping on notifications
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Notification tapped:', response.notification.request.content.title);
            this.handleNotificationResponse(response);
        });

        console.log('✅ Notification listeners set up');
    }

    // Enhanced notification received handler
    async handleNotificationReceived(notification) {
        try {
            const { title, body, data } = notification.request.content;
            
            // Save notification to user's personal collection
            await this.saveNotificationToFirestore({
                title,
                body,
                data: data || {},
                receivedAt: new Date(),
                read: false,
                type: data?.type || 'general'
            });

            // Update badge count
            this.badgeCount += 1;
            await Notifications.setBadgeCountAsync(this.badgeCount);

            // Show custom in-app notification if needed
            console.log(`📧 ${title}: ${body}`);
            
        } catch (error) {
            console.error('❌ Error handling received notification:', error);
        }
    }

    // Enhanced notification response handler with navigation
    async handleNotificationResponse(response) {
        try {
            const { data } = response.notification.request.content;
            
            // Mark notification as read
            await this.markNotificationAsRead(response.notification.request.identifier);
            
            // Handle navigation based on notification data
            if (data?.type === 'issue_update' && data?.issueId) {
                console.log('🔄 Should navigate to issue:', data.issueId);
                // You can implement navigation here based on your routing system
                // Example: router.push(`/issue/${data.issueId}`)
            } else if (data?.type === 'general') {
                console.log('🏠 Should navigate to home/notifications');
                // Navigate to notifications screen
            }

            console.log('✅ Notification response handled');
        } catch (error) {
            console.error('❌ Error handling notification response:', error);
        }
    }

    // Save notification to Firestore user collection
    async saveNotificationToFirestore(notification) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                console.log('⚠️ No user to save notification for');
                return;
            }

            const notificationRef = collection(this.db, `users/${user.uid}/notifications`);
            await addDoc(notificationRef, {
                ...notification,
                userId: user.uid,
                createdAt: serverTimestamp(),
                platform: 'mobile'
            });

            console.log('✅ Notification saved to Firestore');
        } catch (error) {
            console.error('❌ Error saving notification to Firestore:', error);
        }
    }

    // Mark specific notification as read
    async markNotificationAsRead(notificationId) {
        try {
            // Update badge count
            this.badgeCount = Math.max(0, this.badgeCount - 1);
            await Notifications.setBadgeCountAsync(this.badgeCount);
            
            console.log(`✅ Notification ${notificationId} marked as read`);
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    // Update badge count based on unread notifications
    async updateBadgeCount() {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                console.log('⚠️ No user for badge count update');
                return;
            }

            // ✅ FIX: Prevent duplicate badge count listeners
            if (this.badgeCountUnsubscribe) {
                console.log('⚠️ Badge count listener already exists, cleaning up first...');
                this.badgeCountUnsubscribe();
                this.badgeCountUnsubscribe = null;
            }

            // Listen to unread notifications in real-time
            const notificationsRef = collection(this.db, `users/${user.uid}/notifications`);
            const unreadQuery = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));

            this.badgeCountUnsubscribe = onSnapshot(unreadQuery, async (snapshot) => {
                try {
                    let unreadCount = 0;
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        if (!data.read) {
                            unreadCount++;
                        }
                    });

                    this.badgeCount = unreadCount;
                    await Notifications.setBadgeCountAsync(this.badgeCount);
                    console.log(`🔢 Badge count updated: ${this.badgeCount}`);
                } catch (error) {
                    console.error('❌ Error in badge count snapshot listener:', error);
                }
            }, (error) => {
                console.error('❌ Error in badge count listener:', error);
            });

        } catch (error) {
            console.error('❌ Error updating badge count:', error);
        }
    }

    // Send local test notification
    async sendLocalNotification(title, body, data = {}) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: title || 'JanSahyog Test',
                    body: body || 'This is a test notification',
                    data: {
                        type: 'test',
                        timestamp: Date.now(),
                        ...data
                    },
                    sound: 'default',
                    badge: this.badgeCount + 1,
                },
                trigger: null, // Send immediately
            });
            console.log('✅ Local test notification sent');
        } catch (error) {
            console.error('❌ Error sending local notification:', error);
        }
    }

    // Update comprehensive notification preferences
    async updateNotificationPreferences(preferences) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No authenticated user');
            }

            const userRef = doc(this.db, 'users', user.uid);
            await updateDoc(userRef, {
                notificationPreferences: {
                    issueUpdates: preferences.issueUpdates ?? true,
                    generalNews: preferences.generalNews ?? true,
                    emergencyAlerts: preferences.emergencyAlerts ?? true,
                    departmentUpdates: preferences.departmentUpdates ?? true,
                    weeklyDigest: preferences.weeklyDigest ?? true,
                    ...preferences,
                },
                notificationsEnabled: preferences.enabled ?? true,
                lastPreferencesUpdate: serverTimestamp(),
            });

            console.log('✅ Notification preferences updated successfully');
        } catch (error) {
            console.error('❌ Error updating notification preferences:', error);
            throw error;
        }
    }

    // Get current notification permissions
    async getPermissionStatus() {
        try {
            const { status } = await Notifications.getPermissionsAsync();
            console.log('🔐 Current notification permission:', status);
            return status;
        } catch (error) {
            console.error('❌ Error getting permission status:', error);
            return 'unknown';
        }
    }

    // Request notification permissions
    async requestPermissions() {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            console.log('📝 Notification permission request result:', status);
            return status === 'granted';
        } catch (error) {
            console.error('❌ Error requesting permissions:', error);
            return false;
        }
    }

    // Clear all notifications
    async clearAllNotifications() {
        try {
            await Notifications.dismissAllNotificationsAsync();
            await Notifications.setBadgeCountAsync(0);
            this.badgeCount = 0;
            console.log('🧹 All notifications cleared');
        } catch (error) {
            console.error('❌ Error clearing notifications:', error);
        }
    }

    // ✅ FIX: Check if service is initialized
    isServiceInitialized() {
        return this.isInitialized;
    }

    // ✅ FIX: Get current user ID
    getCurrentUserId() {
        return this.currentUserId;
    }

    // ✅ FIX: Enhanced cleanup with all listeners and flags
    cleanup() {
        try {
            console.log('🧹 Starting NotificationService cleanup...');

            // Clean up notification listeners
            if (this.notificationListener) {
                this.notificationListener.remove();
                this.notificationListener = null;
                console.log('🧹 Notification listener removed');
            }

            if (this.responseListener) {
                this.responseListener.remove();
                this.responseListener = null;
                console.log('🧹 Response listener removed');
            }

            // Clean up badge count listener
            if (this.badgeCountUnsubscribe) {
                this.badgeCountUnsubscribe();
                this.badgeCountUnsubscribe = null;
                console.log('🧹 Badge count listener removed');
            }

            // ✅ FIX: Reset all initialization flags
            this.isInitialized = false;
            this.isInitializing = false;
            this.currentUserId = null;
            this.badgeCount = 0;

            console.log('✅ NotificationService cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    // ✅ FIX: Reinitialize service (useful for user switches)
    async reinitialize() {
        console.log('🔄 Reinitializing NotificationService...');
        this.cleanup();
        await this.initialize();
    }
}

export default NotificationService;

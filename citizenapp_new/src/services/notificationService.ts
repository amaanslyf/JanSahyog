// src/services/notificationService.ts - FIXED INFINITE INITIALIZATION
import * as Notifications from 'expo-notifications';
import {
    Firestore,
    updateDoc,
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    getDocs,
    writeBatch,
    doc,
    Unsubscribe
} from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { registerForPushNotificationsAsync } from '../hooks/useFirebase';

export interface NotificationPreferences {
    issueUpdates: boolean;
    generalNews: boolean;
    emergencyAlerts: boolean;
    departmentUpdates: boolean;
    weeklyDigest: boolean;
    enabled?: boolean;
}

export interface NotificationData {
    title: string;
    body: string;
    data: Record<string, any>;
    receivedAt: Date;
    read: boolean;
    type: string;
}

class NotificationService {
    private db: Firestore;
    private auth: Auth;
    private notificationListener: Notifications.Subscription | null = null;
    private responseListener: Notifications.Subscription | null = null;
    private badgeCountUnsubscribe: Unsubscribe | null = null;
    private badgeCount: number = 0;
    private isInitialized: boolean = false;
    private isInitializing: boolean = false;
    private currentUserId: string | null = null;

    constructor(db: Firestore, auth: Auth) {
        this.db = db;
        this.auth = auth;
    }

    // Initialize push notifications for the current user
    async initialize(): Promise<string | null> {
        if (this.isInitialized) {
            console.log('⚠️ NotificationService already initialized, skipping...');
            return null;
        }

        if (this.isInitializing) {
            console.log('⚠️ NotificationService initialization already in progress, skipping...');
            return null;
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

            // Setup notification listeners
            this.setupNotificationListeners();

            // Load initial badge count
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
    async saveTokenToDatabase(token: string): Promise<void> {
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
    setupNotificationListeners(): void {
        if (this.notificationListener || this.responseListener) {
            console.log('⚠️ Notification listeners already set up, skipping...');
            return;
        }

        console.log('🔗 Setting up notification listeners...');

        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('🔔 Foreground notification received:', notification.request.content.title);
            this.handleNotificationReceived(notification);
        });

        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Notification tapped:', response.notification.request.content.title);
            this.handleNotificationResponse(response);
        });

        console.log('✅ Notification listeners set up');
    }

    // Enhanced notification received handler
    private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
        try {
            const { title, body, data } = notification.request.content;

            await this.saveNotificationToFirestore({
                title: title || '',
                body: body || '',
                data: data || {},
                receivedAt: new Date(),
                read: false,
                type: (data?.type as string) || 'general'
            });

            this.badgeCount += 1;
            await Notifications.setBadgeCountAsync(this.badgeCount);

            console.log(`📧 ${title}: ${body}`);

        } catch (error) {
            console.error('❌ Error handling received notification:', error);
        }
    }

    // Enhanced notification response handler with navigation
    private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
        try {
            const { data } = response.notification.request.content;

            await this.markNotificationAsRead(response.notification.request.identifier);

            if (data?.type === 'issue_update' && data?.issueId) {
                console.log('🔄 Should navigate to issue:', data.issueId);
            } else if (data?.type === 'general') {
                console.log('🏠 Should navigate to home/notifications');
            }

            console.log('✅ Notification response handled');
        } catch (error) {
            console.error('❌ Error handling notification response:', error);
        }
    }

    // Save notification to Firestore user collection
    async saveNotificationToFirestore(notification: NotificationData): Promise<void> {
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
    async markNotificationAsRead(notificationId: string): Promise<void> {
        try {
            const user = this.auth.currentUser;
            if (!user) return;

            const notificationRef = doc(this.db, `users/${user.uid}/notifications`, notificationId);
            await updateDoc(notificationRef, {
                read: true,
                readAt: serverTimestamp()
            });

            console.log(`✅ Notification ${notificationId} marked as read in Firestore`);
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    // Mark all notifications as read
    async markAllAsRead(): Promise<void> {
        try {
            const user = this.auth.currentUser;
            if (!user) return;

            const notificationsRef = collection(this.db, `users/${user.uid}/notifications`);
            const unreadQuery = query(notificationsRef, where("read", "==", false));
            const snapshot = await getDocs(unreadQuery);

            if (snapshot.empty) return;

            console.log(`📑 Marking ${snapshot.size} notifications as read...`);

            const batch = writeBatch(this.db);
            snapshot.forEach((document) => {
                batch.update(document.ref, {
                    read: true,
                    readAt: serverTimestamp()
                });
            });

            await batch.commit();
            console.log('✅ All notifications marked as read');
        } catch (error) {
            console.error('❌ Error marking all as read:', error);
        }
    }

    // Update badge count based on unread notifications
    async updateBadgeCount(): Promise<void> {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                console.log('⚠️ No user for badge count update');
                return;
            }

            if (this.badgeCountUnsubscribe) {
                console.log('⚠️ Badge count listener already exists, cleaning up first...');
                this.badgeCountUnsubscribe();
                this.badgeCountUnsubscribe = null;
            }

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
    async sendLocalNotification(title?: string, body?: string, data: Record<string, any> = {}): Promise<void> {
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
                trigger: null,
            });
            console.log('✅ Local test notification sent');
        } catch (error) {
            console.error('❌ Error sending local notification:', error);
        }
    }

    // Update comprehensive notification preferences
    async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
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
    async getPermissionStatus(): Promise<Notifications.PermissionStatus | 'unknown'> {
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
    async requestPermissions(): Promise<boolean> {
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
    async clearAllNotifications(): Promise<void> {
        try {
            await Notifications.dismissAllNotificationsAsync();
            await Notifications.setBadgeCountAsync(0);
            this.badgeCount = 0;
            console.log('🧹 All notifications cleared');
        } catch (error) {
            console.error('❌ Error clearing notifications:', error);
        }
    }

    isServiceInitialized(): boolean {
        return this.isInitialized;
    }

    getCurrentUserId(): string | null {
        return this.currentUserId;
    }

    cleanup(): void {
        try {
            console.log('🧹 Starting NotificationService cleanup...');

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

            if (this.badgeCountUnsubscribe) {
                this.badgeCountUnsubscribe();
                this.badgeCountUnsubscribe = null;
                console.log('🧹 Badge count listener removed');
            }

            this.isInitialized = false;
            this.isInitializing = false;
            this.currentUserId = null;
            this.badgeCount = 0;

            console.log('✅ NotificationService cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    async reinitialize(): Promise<void> {
        console.log('🔄 Reinitializing NotificationService...');
        this.cleanup();
        await this.initialize();
    }
}

export default NotificationService;

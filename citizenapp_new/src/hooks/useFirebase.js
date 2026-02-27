// useFirebase.js - FIXED DUPLICATE TOKEN PREVENTION
import { getApps, initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Firebase configuration loaded from environment variables (.env file)
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize services
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

// Configure notifications with better settings
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        console.log('📱 Handling notification:', notification);
        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        };
    },
});

// Enhanced hook with notifications support
export function useFirebase() {
    return { auth, db, storage, app };
}

// Global flags to prevent duplicate requests
let isRequestingToken = false;
let cachedToken = null;
let pendingResolvers = []; // Promise-based queue instead of busy-wait

// Expo Push Notification Registration with duplicate prevention
export async function registerForPushNotificationsAsync() {
    // Return cached token if available
    if (cachedToken) {
        return cachedToken;
    }

    // Prevent concurrent token requests using Promise queue (no busy-wait)
    if (isRequestingToken) {
        return new Promise((resolve) => {
            pendingResolvers.push(resolve);
        });
    }

    let token;

    try {
        isRequestingToken = true;

        // Configure Android notification channels
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'JanSahyog Notifications',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#2563EB',
                sound: 'default',
                enableLights: true,
                enableVibrate: true,
                showBadge: true,
            });

            // Create additional channels for different notification types
            await Notifications.setNotificationChannelAsync('issue_updates', {
                name: 'Issue Updates',
                importance: Notifications.AndroidImportance.HIGH,
                sound: 'default',
                enableVibrate: true,
            });

            await Notifications.setNotificationChannelAsync('emergency', {
                name: 'Emergency Alerts',
                importance: Notifications.AndroidImportance.MAX,
                sound: 'default',
                enableVibrate: true,
            });
        }

        if (Device.isDevice) {
            // Check existing permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            // Request permissions if not granted
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            
            if (finalStatus !== 'granted') {
                console.log('❌ Push notification permissions denied');
                return null;
            }
            
            try {
                // Get the REAL Expo Push Token
                const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
                
                const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: projectId,
                });
                
                token = tokenData.data;
                cachedToken = token;
                return token;
                
            } catch (e) {
                console.error('Error getting Expo push token:', e);
                
                // Fallback: create a clearly-marked non-real identifier
                // Uses FALLBACK_ prefix so it won't be confused with real tokens
                const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown';
                const fallbackToken = `FALLBACK_${deviceId}_${Date.now()}`;
                cachedToken = fallbackToken;
                return fallbackToken;
            }
        } else {
            // Simulator/emulator — return a clearly-marked test token
            const simulatorToken = `SIMULATOR_${Platform.OS}_${Date.now()}`;
            cachedToken = simulatorToken;
            return simulatorToken;
        }

    } catch (error) {
        console.error('Fatal error in push token registration:', error);
        return null;
    } finally {
        isRequestingToken = false;
        // Resolve all queued waiters with the result
        pendingResolvers.forEach(resolve => resolve(cachedToken));
        pendingResolvers = [];
    }
}

// Enhanced test notification with better formatting
export async function sendTestNotification(title, body, data = {}) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title || 'JanSahyog Update 🏛️',
                body: body || 'Your civic issue has been updated!',
                data: {
                    type: 'test',
                    timestamp: Date.now(),
                    ...data
                },
                sound: 'default',
                badge: 1,
            },
            trigger: null, // Send immediately
        });
        console.log('✅ Test notification sent successfully');
    } catch (error) {
        console.error('❌ Error sending test notification:', error);
    }
}

// Get notification permissions status
export async function getNotificationPermissions() {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        return status;
    } catch (error) {
        console.error('❌ Error getting notification permissions:', error);
        return 'unknown';
    }
}

// Schedule a notification for later
export async function scheduleNotification(title, body, triggerDate, data = {}) {
    try {
        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: 'default',
            },
            trigger: {
                date: triggerDate,
            },
        });
        console.log('⏰ Notification scheduled with ID:', identifier);
        return identifier;
    } catch (error) {
        console.error('❌ Error scheduling notification:', error);
        return null;
    }
}

// Cancel a scheduled notification
export async function cancelScheduledNotification(identifier) {
    try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
        console.log('🗑️ Scheduled notification cancelled:', identifier);
    } catch (error) {
        console.error('❌ Error cancelling notification:', error);
    }
}

// Clear cached token (useful for logout)
export function clearCachedToken() {
    cachedToken = null;
}

// Export individual services
export { auth, db, storage };

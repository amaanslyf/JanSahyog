// useFirebase.ts - FIXED DUPLICATE TOKEN PREVENTION
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from 'firebase/storage';
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

let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize services
const auth: Auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Configure notifications with better settings
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        console.log('📱 Handling notification:', notification);
        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        };
    },
});

export interface FirebaseServices {
    auth: Auth;
    db: Firestore;
    storage: FirebaseStorage;
    app: FirebaseApp;
}

// Enhanced hook with notifications support
export function useFirebase(): FirebaseServices {
    return { auth, db, storage, app };
}

// Global flags to prevent duplicate requests
let isRequestingToken = false;
let cachedToken: string | null = null;
let pendingResolvers: Array<(token: string | null) => void> = [];

// Expo Push Notification Registration with duplicate prevention
export async function registerForPushNotificationsAsync(): Promise<string | null> {
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

                cachedToken = tokenData.data;
                return cachedToken;

            } catch (e) {
                console.error('Error getting Expo push token:', e);

                // Fallback: create a clearly-marked non-real identifier
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
export async function sendTestNotification(title?: string, body?: string, data: Record<string, any> = {}) {
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
export async function getNotificationPermissions(): Promise<string> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        return status;
    } catch (error) {
        console.error('❌ Error getting notification permissions:', error);
        return 'unknown';
    }
}

// Schedule a notification for later
export async function scheduleNotification(title: string, body: string, triggerDate: Date, data: Record<string, any> = {}): Promise<string | null> {
    try {
        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: 'default',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
            } as Notifications.NotificationTriggerInput,
        });
        console.log('⏰ Notification scheduled with ID:', identifier);
        return identifier;
    } catch (error) {
        console.error('❌ Error scheduling notification:', error);
        return null;
    }
}

// Cancel a scheduled notification
export async function cancelScheduledNotification(identifier: string) {
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

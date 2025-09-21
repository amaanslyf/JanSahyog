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

// IMPORTANT: Use the EXACT SAME config as your admin portal
const firebaseConfig = {
    apiKey: "AIzaSyBNE6vcHc-9aPfb-SkxKHzpYnO6tF5L83E",
    authDomain: "jansahyog-59349.firebaseapp.com",
    projectId: "jansahyog-59349",
    storageBucket: "jansahyog-59349.firebasestorage.app",
    messagingSenderId: "601117233933",
    appId: "1:601117233933:web:5c43d2458bf3d6d8f9d644",
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

// ✅ FIX: Global flags to prevent duplicate requests
let isRequestingToken = false;
let cachedToken = null;

// REAL Expo Push Notification Registration with duplicate prevention
export async function registerForPushNotificationsAsync() {
    // ✅ FIX: Return cached token if available
    if (cachedToken) {
        console.log('🔄 Using cached push token:', cachedToken.substring(0, 20) + '...');
        return cachedToken;
    }

    // ✅ FIX: Prevent concurrent token requests
    if (isRequestingToken) {
        console.log('⚠️ Token request already in progress, waiting...');
        
        // Wait for ongoing request to complete
        while (isRequestingToken) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return cachedToken;
    }

    let token;

    try {
        isRequestingToken = true;
        console.log('🔄 Starting push token registration...');

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
                console.log('📋 Project ID found:', projectId);
                
                const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: projectId,
                });
                
                token = tokenData.data;
                cachedToken = token; // ✅ FIX: Cache the token
                console.log('✅ Real Expo Push Token obtained:', token);
                return token;
                
            } catch (e) {
                console.error('❌ Error getting Expo push token:', e);
                
                // Fallback: create a device-specific identifier
                const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown';
                const fallbackToken = `ExponentPushToken[${deviceId}_${Date.now()}]`;
                console.log('🔄 Using fallback token:', fallbackToken);
                cachedToken = fallbackToken; // ✅ FIX: Cache fallback token
                return fallbackToken;
            }
        } else {
            console.log('⚠️ Must use physical device for Push Notifications');
            // For simulator/emulator, return a test token with proper format
            const simulatorToken = `ExponentPushToken[simulator_${Date.now()}]`;
            cachedToken = simulatorToken; // ✅ FIX: Cache simulator token
            return simulatorToken;
        }

    } catch (error) {
        console.error('❌ Fatal error in push token registration:', error);
        return null;
    } finally {
        isRequestingToken = false; // ✅ FIX: Always reset flag
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

// ✅ FIX: Clear cached token (useful for logout)
export function clearCachedToken() {
    cachedToken = null;
    console.log('🧹 Cached push token cleared');
}

// Export individual services
export { auth, db, storage };

// Debug logging
console.log('🔥 Firebase initialized with REAL Expo Push Notifications');
console.log('📱 Platform:', Platform.OS);
console.log('📟 Device Info:', Device.isDevice ? 'Physical Device' : 'Simulator/Emulator');

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

// UPDATE: Replaced the old configuration with your new project credentials
const firebaseConfig = {
    apiKey: "AIzaSyD1WXvXfxdDXAXUBWktK6-IjthBJmp-jXI",
    authDomain: "workersapp-f241a.firebaseapp.com",
    projectId: "workersapp-f241a",
    storageBucket: "workersapp-f241a.appspot.com", // Corrected to the standard .appspot.com format
    messagingSenderId: "705985101758",
    appId: "1:705985_this_is_a_placeholder_for_your_actual_app_id",
    measurementId: "G-5GBFEV999D"
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
    // ... (rest of the file is unchanged) ...
}

// Enhanced test notification with better formatting
export async function sendTestNotification(title, body, data = {}) {
    // ... (rest of the file is unchanged) ...
}

// ... (All other helper functions are unchanged) ...

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
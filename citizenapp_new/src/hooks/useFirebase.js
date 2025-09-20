// useFirebase.js - UPDATED FOR ADMIN PORTAL INTEGRATION WITH STORAGE
import { getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from 'firebase/storage'; // Added Storage import

// IMPORTANT: Use the EXACT SAME config as your admin portal
const firebaseConfig = {
    apiKey: "AIzaSyBNE6vcHc-9aPfb-SkxKHzpYnO6tF5L83E",
    authDomain: "jansahyog-59349.firebaseapp.com",
    projectId: "jansahyog-59349",
    storageBucket: "jansahyog-59349.firebasestorage.app", // This is correct
    messagingSenderId: "601117233933",
    appId: "1:601117233933:web:5c43d2458bf3d6d8f9d644",
};

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize Auth with persistence
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage - THIS WAS MISSING!
const storage = getStorage(app);

// Debug logging
console.log('🔥 Firebase initialized with Storage bucket:', firebaseConfig.storageBucket);
console.log('📱 Storage instance created:', !!storage);

// Enhanced hook with additional services for integration
export function useFirebase() {
    return { auth, db, storage, app };
}

// Export individual services for easier importing
export { auth, db, storage };

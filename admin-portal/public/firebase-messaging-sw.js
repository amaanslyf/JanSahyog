// public/firebase-messaging-sw.js - ESLINT-FIXED SERVICE WORKER
/* eslint-env serviceworker */
/* eslint-disable no-undef, no-restricted-globals */

// Import Firebase scripts for service worker context
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config (same as your main config)
const firebaseConfig = {
  apiKey: "AIzaSyBNE6vcHc-9aPfb-SkxKHzpYnO6tF5L83E",
  authDomain: "jansahyog-59349.firebaseapp.com",
  projectId: "jansahyog-59349",
  storageBucket: "jansahyog-59349.firebasestorage.app",
  messagingSenderId: "601117233933",
  appId: "1:601117233933:web:5c43d2458bf3d6d8f9d644",
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

console.log('🔥 Firebase messaging service worker initialized');

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📱 Background message received:', payload);
  
  // Extract notification data
  const notificationTitle = payload.notification?.title || payload.data?.title || 'JanSahyog Update';
  const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new update';
  const notificationIcon = payload.notification?.icon || payload.data?.icon || '/favicon.ico';
  const notificationData = payload.data || {};
  
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/favicon.ico',
    tag: 'jansahyog-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: notificationData,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/favicon.ico'
      }
    ]
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    // Open the app with specific URL if available
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Navigate to specific page if needed
            if (event.notification.data?.issueId) {
              client.navigate(`/issue/${event.notification.data.issueId}`);
            }
            return;
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('🗑️ Notification dismissed');
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification closed:', event.notification.tag);
});

// Handle service worker install
self.addEventListener('install', (event) => {
  console.log('⚙️ Service worker installing...');
  self.skipWaiting();
});

// Handle service worker activate
self.addEventListener('activate', (event) => {
  console.log('✅ Service worker activated');
  event.waitUntil(clients.claim());
});

console.log('🚀 JanSahyog service worker loaded successfully');

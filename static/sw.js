// Minimal Service Worker for WebTimer PWA
// This allows the app to be installable but doesn't cache for offline use

const CACHE_NAME = 'webtimer-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/static/manifest.json',
  '/static/alarm.js',
  '/static/time-conversion.js',
  '/static/favicon.ico'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  
  // Skip waiting so the service worker activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
  
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

// Basic fetch handler - just pass through to network
self.addEventListener('fetch', (event) => {
  // For the main app, we'll let it go to the network
  // This ensures timers work correctly and data is fresh
  event.respondWith(fetch(event.request));
});

// Handle push notifications (if we add them later)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (clients.openWindow) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyAOQJJH5sZDP_0SsNmcfHsE5__XwAOIPR0",
    authDomain: "spoorthy-school-live-55917.firebaseapp.com",
    projectId: "spoorthy-school-live-55917",
    storageBucket: "spoorthy-school-live-55917.firebasestorage.app",
    messagingSenderId: "740480088621",
    appId: "1:740480088621:web:c5b98d739c1399feee96a4"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Firebase automatically displays a notification if payload.notification is present
    // AND webpush data.link isn't being caught correctly natively by some browsers.
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    // The payload data might be in event.notification.data.url OR event.notification.data.FCM_MSG...
    // But since we use webpush.fcmOptions.link on the server, the link is usually event.notification.data?.url
    // Or we extract it directly from the payload.
    const urlToOpen = event.notification.data?.url || event.notification.data?.link || event.action || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

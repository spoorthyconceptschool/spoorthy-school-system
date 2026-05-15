importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBzMWTDIaP9R7C1GGbNg613ZGV48T1fmeQ",
    authDomain: "spoorthy-16292.firebaseapp.com",
    projectId: "spoorthy-16292",
    storageBucket: "spoorthy-16292.firebasestorage.app",
    messagingSenderId: "248869775868",
    appId: "1:248869775868:web:96492410eb8d69284aea79"
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

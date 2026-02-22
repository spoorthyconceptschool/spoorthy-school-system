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
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'https://firebasestorage.googleapis.com/v0/b/spoorthy-school-live-55917.firebasestorage.app/o/demo%2Flogo.png?alt=media'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

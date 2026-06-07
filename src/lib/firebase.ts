import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, Firestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBzMWTDIaP9R7C1GGbNg613ZGV48T1fmeQ",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "spoorthy-16292.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "spoorthy-16292",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "spoorthy-16292.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "248869775868",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:248869775868:web:96492410eb8d69284aea79",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-68FDGMHRKP",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://spoorthy-16292-default-rtdb.firebaseio.com"
};

// Initialize Firebase singleton
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let db: Firestore;

// Robust Firestore Initialization with Persistence (Zero-Latency Pillar)
if (typeof window !== "undefined") {
    // @ts-ignore - Cache db instance on window to survive Next.js HMR
    if (!window.__fireDb) {
        try {
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
            // @ts-ignore
            window.__fireDb = db;
        } catch (e: any) {
            // Fallback if already initialized
            db = getFirestore(app);
            // @ts-ignore
            window.__fireDb = db;
        }
    } else {
        // @ts-ignore
        db = window.__fireDb;
    }
} else {
    db = getFirestore(app);
}

const auth = getAuth(app);
if (typeof window !== "undefined") {
    // Mandate persistent storage to survive PWA closed state
    setPersistence(auth, browserLocalPersistence).catch(console.error);
}

const functions = getFunctions(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);

let messaging: any = null;
if (typeof window !== "undefined") {
    import("firebase/messaging").then(({ getMessaging }) => {
        messaging = getMessaging(app);
    });
}

let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
}

export { app, auth, db, functions, storage, rtdb, messaging, analytics };

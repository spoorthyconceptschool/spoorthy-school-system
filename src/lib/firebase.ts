import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, Firestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Initialize Firebase singleton
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let db: Firestore;

// Robust Firestore Initialization with Persistence (Zero-Latency Pillar)
if (typeof window !== "undefined") {
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
    } catch (e: any) {
        // Fallback if already initialized (common in HMR)
        db = getFirestore(app);
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

export { app, auth, db, functions, storage, rtdb, messaging };

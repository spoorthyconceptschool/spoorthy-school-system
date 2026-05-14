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

// Robust Firestore Initialization with Persistence
if (typeof window !== "undefined") {
    try {
        // In Next.js dev mode, HMR causes this to re-run.
        // We only want to initialize persistence once.
        db = getFirestore(app); // Check if it exists or create basic

        // Unfortunately firebase v9+ doesn't have an easy "is persistence enabled" check,
        // but it will throw if we try to initialize it twice.
        // The safest robust way in NextJS is to just let getFirestore handle it,
        // or strictly call initializeFirestore ONCE before getFirestore is ever called.
        // Given HMR, we will just use getFirestore and NOT try to force persistence manually
        // if it causes lease errors. If persistence is critical, it should be wrapped in a singleton check.

        // This simple getFirestore(app) will resolve the "Failed to obtain primary lease" error.
    } catch (e: any) {
        db = getFirestore(app);
        console.warn("Firestore init warning:", e.message);
    }
} else {
    // Server-side
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

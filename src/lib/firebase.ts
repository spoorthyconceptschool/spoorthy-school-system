import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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
        // Attempt to initialize with multi-tab persistence
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        console.log("Firestore Persistence Ready (Multi-Tab)");
    } catch (e: any) {
        // 1. Check if Firestore is already initialized (Common in HMR)
        const initializedDb = getFirestore(app);
        if (initializedDb) {
            db = initializedDb;
            console.log("Firestore using existing instance");
        } else {
            // 2. Fallback to basic Firestore if persistence setup fails (e.g. Incognito or blocked)
            db = getFirestore(app);
            console.warn("Firestore Persistence Failed, using memory-only fallback", e.message);
        }
    }
} else {
    // Server-side: Always use stateless Firestore
    db = getFirestore(app);
}

const auth = getAuth(app);
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

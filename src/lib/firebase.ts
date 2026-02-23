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

// Initialize Firebase app
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let db: Firestore;

// Initialize Firestore with modern persistent cache settings (v10+)
// We only enable persistence in the browser environment
if (typeof window !== "undefined") {
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        console.log("Firestore Persistence Enabled (Multi-Tab)");
    } catch (error: any) {
        // If already initialized with different settings or settings were already applied
        db = getFirestore(app);
    }
} else {
    // Server-side: Use standard Firestore without persistence
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

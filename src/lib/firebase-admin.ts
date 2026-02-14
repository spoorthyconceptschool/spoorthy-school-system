import "server-only";
import admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_PRIVATE_KEY) {
            console.log(`[FirebaseAdmin] Initializing with project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}, bucket: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}`);
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                }),
                databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
            });
        } else {
            console.warn("FIREBASE_PRIVATE_KEY missing. Admin SDK not initialized.");
        }
    } catch (error) {
        console.error("Firebase Admin Init Failed:", error);
    }
}

export const adminDb = admin.apps.length ? admin.firestore() : null as any;
export const adminAuth = admin.apps.length ? admin.auth() : null as any;
export const adminStorage = admin.apps.length ? admin.storage() : null as any;
export const adminRtdb = admin.apps.length ? admin.database() : null as any;

const { initializeApp } = require("firebase/app");
const { getDatabase, ref, update } = require("firebase/database");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env.local") });

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

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

const VALID_LOGO = "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png";

async function fixBrandingInDb() {
    try {
        console.log("Updating RTDB with valid logo...");

        const updates = {
            "siteContent/branding/schoolLogo": VALID_LOGO,
            "master/branding/schoolLogo": VALID_LOGO
        };

        await update(ref(rtdb), updates);

        console.log("Success! Database branding logo updated.");
        process.exit(0);
    } catch (e) {
        console.error("Failed to update RTDB:", e);
        process.exit(1);
    }
}

fixBrandingInDb();

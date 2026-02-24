const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");
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

async function checkBranding() {
    try {
        const siteBrandingSnap = await get(ref(rtdb, 'siteContent/branding'));
        const masterBrandingSnap = await get(ref(rtdb, 'master/branding'));

        console.log("=== siteContent/branding ===");
        console.log(JSON.stringify(siteBrandingSnap.val(), null, 2));

        console.log("\n=== master/branding ===");
        console.log(JSON.stringify(masterBrandingSnap.val(), null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkBranding();

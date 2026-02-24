
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

async function checkRTDB() {
    try {
        console.log("Checking RTDB at:", process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
        const snapshot = await db.ref('master').once('value');
        if (snapshot.exists()) {
            console.log("SUCCESS: 'master' node exists.");
            console.log("Keys found:", Object.keys(snapshot.val()));
        } else {
            console.log("FAILURE: 'master' node does NOT exist.");
        }
    } catch (error) {
        console.error("ERROR checking RTDB:", error.message);
    }
    process.exit();
}

checkRTDB();

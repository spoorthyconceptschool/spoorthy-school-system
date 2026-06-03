const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const privateKey = process.env.SERVICE_ACCOUNT_PRIVATE_KEY
    ? process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
    : "";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "spoorthy-16292",
            clientEmail: "firebase-adminsdk-fbsvc@spoorthy-16292.iam.gserviceaccount.com",
            privateKey: privateKey
        }),
        databaseURL: "https://spoorthy-16292-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

async function run() {
    console.log("=== notices schema diagnostics ===");

    // 1. Get sample notices
    const noticesSnap = await db.collection("notices").limit(5).get();
    console.log(`\nNotices count: ${noticesSnap.size}`);
    noticesSnap.forEach((d, idx) => {
        console.log(`Notice ${idx + 1}:`, d.data());
    });

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

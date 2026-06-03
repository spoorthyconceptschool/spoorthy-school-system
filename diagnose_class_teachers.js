require('dotenv').config({ path: './.env.local' });
const admin = require('firebase-admin');

const projectId = "spoorthy-16292";
const clientEmail = "firebase-adminsdk-fbsvc@spoorthy-16292.iam.gserviceaccount.com";
const rawKey = process.env.SERVICE_ACCOUNT_PRIVATE_KEY;

if (!rawKey) {
    console.error("SERVICE_ACCOUNT_PRIVATE_KEY not found!");
    process.exit(1);
}

const privateKey = rawKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        }),
        databaseURL: "https://spoorthy-16292-default-rtdb.firebaseio.com"
    });
}

const db = admin.database();

async function run() {
    console.log("=== Querying Class Teachers in RTDB ===");
    const ref = db.ref("master/classSections");
    const snap = await ref.once("value");
    if (snap.exists()) {
        const val = snap.val();
        Object.entries(val).forEach(([key, csObj]) => {
            console.log(`Class Section: ${key}, classTeacherId: ${csObj.classTeacherId}, classTeacherName: ${csObj.classTeacherName}, active: ${csObj.active}, isActive: ${csObj.isActive}`);
        });
    } else {
        console.log("master/classSections node does not exist!");
    }
    process.exit(0);
}

run().catch(console.error);

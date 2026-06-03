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
    console.log("=== Querying RTDB for TCH100 ===");
    const ref = db.ref("master/subjectTeachers");
    const snap = await ref.once("value");
    if (snap.exists()) {
        const val = snap.val();
        console.log("All subjectTeachers keys:", Object.keys(val));
        Object.entries(val).forEach(([classKey, subjectsObj]) => {
            Object.entries(subjectsObj).forEach(([subId, teacherId]) => {
                if (teacherId === "TCH100") {
                    console.log(`- TCH100 teaches ${subId} in class key: ${classKey}`);
                }
            });
        });
    } else {
        console.log("master/subjectTeachers node does not exist!");
    }
}

run().catch(console.error);

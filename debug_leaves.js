const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
        })
    });
}

const db = admin.firestore();

async function listLeaves() {
    console.log("Fetching leaves...");
    const snap = await db.collection('leave_requests').get();
    console.log(`Total leave requests: ${snap.size}`);
    snap.forEach(doc => {
        const d = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(JSON.stringify(d, null, 2));
        console.log('---');
    });
}

listLeaves();

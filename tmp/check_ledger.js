
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkLedger() {
    const snap = await db.collection('student_fee_ledgers').limit(1).get();
    if (snap.empty) {
        console.log('No ledgers found');
        return;
    }
    snap.forEach(doc => {
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

checkLedger().catch(console.error);

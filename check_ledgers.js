const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkLedgers() {
    const q = query(collection(db, "student_fee_ledgers"), limit(5));
    const snap = await getDocs(q);
    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Student: ${data.studentName} (${data.studentId})`);
        console.log(`Total Fee: ${data.totalFee}`);
        console.log(`Items:`, JSON.stringify(data.items, null, 2));
        console.log('---');
    });
    process.exit(0);
}

checkLedgers().catch(err => {
    console.error(err);
    process.exit(1);
});

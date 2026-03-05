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

async function checkUser(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        console.log("User Data:", userDoc.data());
    } else {
        console.log("User not found in 'users' collection.");
    }

    const teacherSnap = await db.collection('teachers').where('uid', '==', uid).get();
    if (!teacherSnap.empty) {
        teacherSnap.forEach(d => {
            console.log("Teacher Profile:", d.id, d.data());
        });
    } else {
        console.log("Teacher profile not found for this UID.");
    }
}

const uid = process.argv[2] || 'keONikFhSraojwiAcbqGvxE7rQk2';
checkUser(uid);

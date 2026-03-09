const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function debugTeachers() {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

        if (!privateKey || !clientEmail) {
            console.error("Missing credentials in .env.local");
            return;
        }

        privateKey = privateKey.replace(/\\n/g, '\n');
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                databaseURL
            });
        }

        const db = admin.database();
        const firestore = admin.firestore();

        console.log("--- FETCHING TEACHERS FROM FIRESTORE ---");
        const teachersSnap = await firestore.collection('teachers').get();
        const teachers = [];
        teachersSnap.forEach(doc => {
            const data = doc.data();
            teachers.push({
                docId: doc.id,
                schoolId: data.schoolId,
                name: data.name,
                uid: data.uid,
                classTeacherOf: data.classTeacherOf
            });
        });

        console.log("\n--- FETCHING CLASS SECTIONS FROM RTDB ---");
        const classSectionsRef = db.ref('master/classSections');
        const snapshot = await classSectionsRef.once('value');
        const classSections = snapshot.val();

        fs.writeFileSync(path.join(__dirname, 'debug.json'), JSON.stringify({ teachers, classSections }, null, 2), 'utf-8');
        console.log("Written to debug.json");

        process.exit(0);
    } catch (error) {
        console.error("Error debugging teachers:", error);
        process.exit(1);
    }
}

debugTeachers();

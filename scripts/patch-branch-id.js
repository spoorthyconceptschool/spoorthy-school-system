const admin = require('firebase-admin');
const path = require('path');

// Initialize using the same approach as the app
const serviceAccountPath = path.resolve(__dirname, '../src/config/serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function patchCollection(collectionName) {
    console.log(`Patching ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();
    let batch = db.batch();
    let count = 0;
    let totalUpdated = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.branchId) {
            batch.update(doc.ref, { branchId: "SHS" });
            count++;
            totalUpdated++;
            if (count >= 450) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
    }
    
    if (count > 0) {
        await batch.commit();
    }
    console.log(`Updated ${totalUpdated} documents in ${collectionName}.`);
}

async function run() {
    try {
        await patchCollection('students');
        await patchCollection('teachers');
        await patchCollection('exam_results');
        await patchCollection('student_fee_ledgers');
        await patchCollection('payments');
        await patchCollection('attendance_daily');
        await patchCollection('leave_requests');
        console.log("All done!");
    } catch (e) {
        console.error(e);
    }
}

run();

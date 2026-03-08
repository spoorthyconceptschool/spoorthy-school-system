require('dotenv').config({ path: '.env.local' });
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
}

const db = admin.firestore();

async function migrate() {
    console.log("Starting admissionNumber migration...");
    const studentsSnap = await db.collection("students").get();

    let migratedCount = 0;
    const batch = db.batch();

    let updatesInBatch = 0;

    for (const doc of studentsSnap.docs) {
        const data = doc.data();
        if (!data.admissionNumber || data.admissionNumber === "PENDING") {
            const resolvedNumber = data.schoolId || doc.id;
            batch.update(doc.ref, { admissionNumber: resolvedNumber });
            migratedCount++;
            updatesInBatch++;

            if (updatesInBatch === 450) {
                await batch.commit();
                updatesInBatch = 0;
            }
        }
    }

    if (updatesInBatch > 0) {
        await batch.commit();
    }

    console.log(`Migration complete. Updated ${migratedCount} students.`);
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});

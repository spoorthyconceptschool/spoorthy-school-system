const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin (avoiding re-initialization error if run multiple times)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

async function migrateTimetables() {
    try {
        console.log("Starting Timetable Migration...");
        const classTimetablesRef = db.collection('class_timetables');
        const snapshot = await classTimetablesRef.get();

        if (snapshot.empty) {
            console.log("No timetables found to migrate.");
            return;
        }

        let migratedCount = 0;
        const batch = db.batch();

        snapshot.forEach(doc => {
            const id = doc.id;
            // Look for IDs matching like 2026-2027_class_LKG_A
            if (id.includes('_class_')) {
                const newId = id.replace('_class_', '_');
                console.log(`Migrating: ${id} -> ${newId}`);

                const data = doc.data();
                const newRef = classTimetablesRef.doc(newId);

                // Assuming we want to keep the old ones intact for safety, or we can delete them.
                // For safety, let's just copy them over first. We can add a delete command if we are sure.
                batch.set(newRef, data);
                // To delete the old ones:
                // batch.delete(doc.ref);
                migratedCount++;
            }
        });

        if (migratedCount > 0) {
            await batch.commit();
            console.log(`Successfully migrated ${migratedCount} timetables.`);
        } else {
            console.log("No timetables needed migration (none had the '_class_' format).");
        }
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrateTimetables();

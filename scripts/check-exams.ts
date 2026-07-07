import { adminDb } from "../src/lib/firebase-admin";

async function checkExams() {
    const snap = await adminDb.collection('exams').get();
    console.log(`Found ${snap.size} exams`);
    snap.docs.forEach((doc: any) => {
        console.log(doc.id, '=>', doc.data());
    });
}

checkExams().then(() => process.exit(0));

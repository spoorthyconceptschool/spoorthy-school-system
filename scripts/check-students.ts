import { adminDb } from "../src/lib/firebase-admin";
import * as fs from 'fs';

async function checkStudents() {
    const students = await adminDb.collection("students").limit(5).get();
    const results: any[] = [];
    students.forEach((doc: any) => {
        results.push({
            docId: doc.id,
            ...doc.data()
        });
    });
    fs.writeFileSync('./students_check.json', JSON.stringify(results, null, 2));
}

checkStudents().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

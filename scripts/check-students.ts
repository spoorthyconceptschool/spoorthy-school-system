import { adminDb } from "../src/lib/firebase-admin";
import * as fs from 'fs';

async function checkStudents() {
    const students = await adminDb.collection("students").limit(5).get();
    const results = [];
    students.forEach(doc => {
        results.push({
            docId: doc.id,
            schoolId: doc.data().schoolId,
            studentName: doc.data().studentName
        });
    });
    fs.writeFileSync('./students_check.json', JSON.stringify(results, null, 2));
}

checkStudents().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

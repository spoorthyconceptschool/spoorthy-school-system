const admin = require('firebase-admin');
const serviceAccount = require('./src/lib/service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function diagnoseClass1() {
    console.log("--- Diagnostic Audit: Class 1 students ---");

    // 1. Check master_classes
    const classesSnap = await db.collection("master_classes").get();
    console.log(`Found ${classesSnap.size} master classes.`);
    classesSnap.forEach(d => {
        const data = d.data();
        if (data.name === "Class 1") {
            console.log(`Found Master Class 'Class 1': ID=${d.id}`, data);
        }
    });

    // 2. Check a sample student for Class 1
    const studentsSnap = await db.collection("students").where("className", "==", "Class 1").limit(5).get();
    console.log(`Found ${studentsSnap.size} students with className='Class 1'`);
    studentsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`Student ${data.schoolId}: classId='${data.classId}', sectionId='${data.sectionId}', academicYear='${data.academicYear}'`);
    });

    // 3. Unique IDs
    const allStudents = await db.collection("students").limit(20).get();
    const uniqueClassIds = new Set();
    allStudents.forEach(doc => uniqueClassIds.add(doc.data().classId));
    console.log("Sample classIds in students:", Array.from(uniqueClassIds));
}

diagnoseClass1().catch(console.error);

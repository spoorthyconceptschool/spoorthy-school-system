import { adminDb } from "./src/lib/firebase-admin";

async function diagnoseClass1() {
    console.log("--- DIagnostic Audit: Class 1 students ---");

    // 1. Check master_classes
    const classesSnap = await adminDb.collection("master_classes").get();
    const class1 = classesSnap.docs.find(d => d.data().name === "Class 1");
    if (class1) {
        console.log(`Found Master Class 'Class 1': ID=${class1.id}`, class1.data());
    } else {
        console.log("Master Class 'Class 1' NOT FOUND by name.");
    }

    // 2. Check a sample student for Class 1
    const studentsSnap = await adminDb.collection("students").where("className", "==", "Class 1").limit(5).get();
    console.log(`Found ${studentsSnap.size} students with className='Class 1'`);
    studentsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`Student ${data.schoolId}: classId='${data.classId}', sectionId='${data.sectionId}', academicYear='${data.academicYear}'`);
    });

    // 3. Check subject_teachers assignment for Class 1
    // subjectTeachers is in RTDB, but we can check if there are any students with a specific classId
    const allStudents = await adminDb.collection("students").limit(10).get();
    const uniqueClassIds = new Set();
    allStudents.forEach(doc => uniqueClassIds.add(doc.data().classId));
    console.log("Unique classIds in sample students:", Array.from(uniqueClassIds));
}

diagnoseClass1();

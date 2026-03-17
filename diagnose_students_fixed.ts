
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const serviceAccountPath = "C:\\Users\\prane\\.gemini\\antigravity\\scratch\\spoorthy-school-system\\src\\lib\\service-account.json";
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function diagnose() {
    console.log("--- Integrated Student Diagnosis ---");

    // 1. Check teacher TCH100
    const teacherSnap = await db.collection("teachers").where("schoolId", "==", "TCH100").get();
    if (teacherSnap.empty) {
        console.log("Teacher TCH100 not found!");
        return;
    }
    const teacher = teacherSnap.docs[0].data();
    console.log(`Teacher: ${teacher.name}`);

    // 2. Check timetable_entries for this teacher (This is what the dashboard uses)
    const ttSnap = await db.collection("timetable_entries").where("teacherId", "==", "TCH100").get();
    console.log(`Timetable Entries: ${ttSnap.size}`);

    const classes = new Map();
    ttSnap.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.classId}_${data.sectionId}`;
        classes.set(key, {
            classId: data.classId,
            sectionId: data.sectionId,
            className: data.className,
            sectionName: data.sectionName
        });
    });

    console.log("Assigned Classes (from TT):", Array.from(classes.values()));

    // 3. For each assigned class, check how many students exist
    for (const [key, info] of classes.entries()) {
        const studentsSnap = await db.collection("students")
            .where("classId", "==", info.classId)
            .where("sectionId", "==", info.sectionId)
            .get();
        console.log(`Class ${info.className}-${info.sectionName} (ID: ${info.classId}, SecID: ${info.sectionId}): ${studentsSnap.size} students`);

        if (studentsSnap.size > 0) {
            const first = studentsSnap.docs[0].data();
            console.log(`  Sample Student: ${first.studentName}, Year: ${first.academicYear}`);
        } else {
            // Try searching by name? 
            const nameSnap = await db.collection("students")
                .where("className", "==", info.className)
                .get();
            console.log(`  Searching by className '${info.className}': found ${nameSnap.size} students`);
        }
    }

    // 4. Check academic years presence
    const yearSummary: Record<string, number> = {};
    const allStudents = await db.collection("students").limit(100).get();
    allStudents.forEach(d => {
        const y = d.data().academicYear || "MISSING";
        yearSummary[y] = (yearSummary[y] || 0) + 1;
    });
    console.log("Academic Year Summary (sample of 100):", yearSummary);
}

diagnose().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

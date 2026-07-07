import { adminDb } from "../src/lib/firebase-admin";

async function assignRollNumbers() {
    console.log("Fetching all active students...");
    const snap = await adminDb.collection("students").where("status", "==", "ACTIVE").get();
    const students = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as any[];

    // Group by branch + class + section
    const grouped: Record<string, any[]> = {};
    for (const student of students) {
        const key = `${student.branchId}_${student.classId}_${student.sectionId}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(student);
    }

    let updatedCount = 0;
    const batch = adminDb.batch();

    for (const key in grouped) {
        const sectionStudents = grouped[key];
        // Sort alphabetically by name
        sectionStudents.sort((a, b) => a.studentName.localeCompare(b.studentName));
        
        // Assign roll numbers starting from 1
        let rollCounter = 1;
        for (const student of sectionStudents) {
            if (!student.rollNo) {
                const rollStr = rollCounter.toString().padStart(2, '0');
                batch.update(adminDb.collection("students").doc(student.id), { rollNo: rollStr });
                updatedCount++;
            }
            rollCounter++;
        }
    }

    if (updatedCount > 0) {
        console.log(`Committing roll numbers for ${updatedCount} students...`);
        await batch.commit();
        console.log("Success!");
    } else {
        console.log("No missing roll numbers found.");
    }
}

assignRollNumbers().then(() => process.exit(0)).catch(console.error);

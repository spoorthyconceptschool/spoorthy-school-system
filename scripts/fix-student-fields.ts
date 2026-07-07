import { adminDb } from "../src/lib/firebase-admin";

async function fixStudentFields() {
    console.log("Fetching branches to get studentIdPrefix...");
    const branchesSnap = await adminDb.collection("branches").get();
    let defaultPrefix = "SCS";
    const prefixes: Record<string, string> = {};
    
    for (const doc of branchesSnap.docs) {
        prefixes[doc.id] = doc.data().studentIdPrefix || "SCS";
    }

    console.log("Fetching global branding as fallback...");
    const globalBranding = await adminDb.collection("branding").doc("global").get();
    if (globalBranding.exists) {
        defaultPrefix = globalBranding.data()?.studentIdPrefix || "SCS";
    }

    console.log("Fetching all active students...");
    const snap = await adminDb.collection("students").get();
    
    let updatedCount = 0;
    const batch = adminDb.batch();

    // Group students by branch to maintain sequence
    const studentsByBranch: Record<string, any[]> = {};
    for (const doc of snap.docs) {
        const student = doc.data();
        student._ref = doc.ref;
        if (!studentsByBranch[student.branchId]) {
            studentsByBranch[student.branchId] = [];
        }
        studentsByBranch[student.branchId].push(student);
    }

    for (const branchId in studentsByBranch) {
        const prefix = prefixes[branchId] || defaultPrefix;
        console.log(`Using prefix '${prefix}' for branch ${branchId}`);
        const students = studentsByBranch[branchId];
        
        // Sort students by creation time to assign sequential IDs
        students.sort((a, b) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeA - timeB;
        });

        let counter = 1000;
        for (const student of students) {
            counter++;
            const paddedId = String(counter).padStart(5, '0');
            const newAdmissionNo = `${prefix}${paddedId}`;
            
            let needsUpdate = false;
            const updates: any = {};

            if (student.admissionNo !== newAdmissionNo) {
                updates.admissionNo = newAdmissionNo;
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(student._ref, updates);
                updatedCount++;
            }
        }
    }

    if (updatedCount > 0) {
        console.log(`Committing fixes for ${updatedCount} students...`);
        await batch.commit();
        console.log("Success!");
    } else {
        console.log("No missing fields found.");
    }
}

fixStudentFields().then(() => process.exit(0)).catch(console.error);

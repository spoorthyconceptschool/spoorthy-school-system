import { adminDb } from "../src/lib/firebase-admin";

async function testStudentsQuery(branchId: string, year: string) {
    console.log(`\nTesting Students Query for branch: ${branchId}, year: ${year}...`);
    try {
        const q = adminDb.collection("students")
            .where("academicYear", "==", year)
            .where("branchId", "==", branchId)
            .where("status", "==", "ACTIVE")
            .limit(300);
        const snap = await q.get();
        console.log(`  Success! Found ${snap.size} students.`);
    } catch (e: any) {
        console.error("  FAILED Students Query:", e.message);
    }
}

async function testTeachersQuery(branchId: string) {
    console.log(`\nTesting Teachers Query for branch: ${branchId}...`);
    try {
        const q = adminDb.collection("teachers")
            .where("status", "==", "ACTIVE")
            .where("branchId", "==", branchId);
        const snap = await q.get();
        console.log(`  Success! Found ${snap.size} teachers.`);
    } catch (e: any) {
        console.error("  FAILED Teachers Query:", e.message);
    }
}

async function testStaffQuery(branchId: string) {
    console.log(`\nTesting Staff Query for branch: ${branchId}...`);
    try {
        const q = adminDb.collection("staff")
            .where("status", "==", "ACTIVE")
            .where("branchId", "==", branchId);
        const snap = await q.get();
        console.log(`  Success! Found ${snap.size} staff.`);
    } catch (e: any) {
        console.error("  FAILED Staff Query:", e.message);
    }
}

async function run() {
    const targetBranch = "W4ZEOJXUpmccvyffIaIo";
    const targetYear = "2026-2027";
    await testStudentsQuery(targetBranch, targetYear);
    await testTeachersQuery(targetBranch);
    await testStaffQuery(targetBranch);
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

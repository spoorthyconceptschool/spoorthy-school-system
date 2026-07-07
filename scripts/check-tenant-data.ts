import { adminDb } from "../src/lib/firebase-admin";

async function countForBranch(branchId: string) {
    const students = await adminDb.collection("students").where("branchId", "==", branchId).get();
    const teachers = await adminDb.collection("teachers").where("branchId", "==", branchId).get();
    const staff = await adminDb.collection("staff").where("branchId", "==", branchId).get();
    const villages = await adminDb.collection("villages").where("branchId", "==", branchId).get();
    const classes = await adminDb.collection("classes").where("branchId", "==", branchId).get();
    const sections = await adminDb.collection("sections").where("branchId", "==", branchId).get();

    console.log(`Branch [${branchId}]:`);
    console.log(`  Students: ${students.size}`);
    console.log(`  Teachers: ${teachers.size}`);
    console.log(`  Staff: ${staff.size}`);
    console.log(`  Villages: ${villages.size}`);
    console.log(`  Classes: ${classes.size}`);
    console.log(`  Sections: ${sections.size}`);
}

async function run() {
    await countForBranch("W4ZEOJXUpmccvyffIaIo");
    await countForBranch("R63uU7cnSsLtDs6B1UeV");
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

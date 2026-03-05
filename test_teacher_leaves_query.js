require('ts-node').register({
    compilerOptions: { module: 'commonjs' }
});
const { adminDb } = require('./src/lib/firebase-admin');

async function testQuery() {
    console.log("Testing Teacher Student Leaves Query...");

    try {
        const classId = "-OmQ0fXljbqkKKIyKOaa";
        const sectionId = "-OmQ0iTY2p1GeqFJqKbb";

        console.log("0. Simple get all leaves...");
        const allLeaves = await adminDb.collection("student_leaves").get();
        console.log(`Found ${allLeaves.size} total leave requests.`);
        allLeaves.forEach(doc => {
            console.log(doc.id, doc.data());
        });

        console.log("\n1. Querying with where + where + orderBy...");
        let q = adminDb.collection("student_leaves")
            .where("classId", "==", classId)
            .where("status", "==", "PENDING");

        if (sectionId) {
            q = q.where("sectionId", "==", sectionId);
        }

        q = q.orderBy("createdAt", "desc").limit(50);

        const snap = await q.get();
        console.log(`Success! Found ${snap.size} leave requests.`);
    } catch (e) {
        console.error("Query Failed:", e.message);
    }
}

testQuery();

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testQuery() {
    console.log("Testing Student Directory Query...");
    const selectedYear = "2026-2027";

    try {
        console.log("1. Simple where query...");
        const q1 = db.collection("students").where("academicYear", "==", selectedYear).limit(5);
        const s1 = await q1.get();
        console.log(`- Success: Found ${s1.size} students.`);

        console.log("2. Where + OrderBy query...");
        const q2 = db.collection("students")
            .where("academicYear", "==", selectedYear)
            .orderBy("studentName", "asc")
            .limit(5);
        const s2 = await q2.get();
        console.log(`- Success: Found ${s2.size} students with OrderBy.`);
    } catch (e) {
        console.error("!!! Query Failed:", e.message);
        if (e.message.includes("index")) {
            console.log("CRITICAL: Missing composite index detected.");
        }
    }
}

testQuery();

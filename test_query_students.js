const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const privateKey = process.env.SERVICE_ACCOUNT_PRIVATE_KEY
    ? process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
    : "";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "spoorthy-16292",
            clientEmail: "firebase-adminsdk-fbsvc@spoorthy-16292.iam.gserviceaccount.com",
            privateKey: privateKey
        }),
        databaseURL: "https://spoorthy-16292-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

async function run() {
    // 1. Direct query test
    try {
        const testQ = await db.collection("students")
            .where("academicYear", "==", "2026-2027")
            .where("branchId", "==", "W4ZEOJXUpmccvyffIaIo")
            .where("status", "==", "ACTIVE")
            .get();
        console.log(`Direct query count with ACTIVE status: ${testQ.size}`);
    } catch (err) {
        console.error("Direct query failed:", err.message);
    }
    // 1. Count students
    const studentsSnap = await db.collection("students").get();
    console.log(`Total students in Firestore: ${studentsSnap.size}`);
    if (studentsSnap.size > 0) {
        console.log("Sample student doc:", studentsSnap.docs[0].id, studentsSnap.docs[0].data());
    }

    // 2. Count by branchId
    const branchesMap = {};
    studentsSnap.forEach(doc => {
        const data = doc.data();
        const bId = data.branchId || "undefined";
        const yr = data.academicYear || "undefined";
        const key = `${bId} | ${yr}`;
        branchesMap[key] = (branchesMap[key] || 0) + 1;
    });
    console.log("\nStudent counts by [branchId | academicYear]:", branchesMap);

    // 3. Count villages and classes
    const villagesSnap = await db.collection("villages").get();
    console.log(`\nTotal villages in Firestore: ${villagesSnap.size}`);
    if (villagesSnap.size > 0) {
        console.log("Sample village:", villagesSnap.docs[0].id, villagesSnap.docs[0].data());
    }

    const classesSnap = await db.collection("classes").get();
    console.log(`Total classes in Firestore: ${classesSnap.size}`);
    if (classesSnap.size > 0) {
        console.log("Sample class:", classesSnap.docs[0].id, classesSnap.docs[0].data());
    }

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

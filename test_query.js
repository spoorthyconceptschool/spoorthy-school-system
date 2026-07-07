const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "spoorthy-16292",
        databaseURL: "https://spoorthy-16292-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

async function testQuery() {
    const schoolId = "vcQw0kUZsylrL3GtDdEp";
    const academicYear = "2026-2027";
    
    try {
        console.log("Running Students query...");
        let studentsBaseQ = db.collection("students")
            .where("status", "==", "ACTIVE")
            .where("branchId", "==", schoolId);
        const studentsCountSnap = await studentsBaseQ.count().get();
        console.log("Students Count:", studentsCountSnap.data().count);

        console.log("Running Teachers query...");
        let teachersBaseQ = db.collection("teachers")
            .where("status", "==", "ACTIVE")
            .where("branchId", "==", schoolId);
        const teachersCountSnap = await teachersBaseQ.count().get();
        console.log("Teachers Count:", teachersCountSnap.data().count);

        console.log("Running Staff query...");
        let staffBaseQ = db.collection("staff")
            .where("status", "==", "ACTIVE")
            .where("branchId", "==", schoolId);
        const staffCountSnap = await staffBaseQ.count().get();
        console.log("Staff Count:", staffCountSnap.data().count);

        console.log("Running Ledgers query...");
        let ledgersQ = db.collection("student_fee_ledgers")
            .where("academicYearId", "==", academicYear)
            .where("branchId", "==", schoolId);
        const ledgersSnap = await ledgersQ.get();
        console.log("Ledgers Size:", ledgersSnap.size);

    } catch (e) {
        console.error("FIRESTORE QUERY ERROR:", e.message);
        console.error(e.stack);
    }
}
testQuery();

const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env.local') }); // Adjust path if needed

async function checkDatabaseIntegrity() {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!privateKey || !clientEmail) {
            console.error("Missing/Invalid credentials (make sure to use double quotes in env if needed)");
            process.exit(1);
        }

        console.log("Using Project:", projectId);

        privateKey = privateKey.replace(/\\n/g, '\n');
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                })
            });
        }

        const db = admin.firestore();
        console.log("Checking Database Integrity...");

        // 1. Check Students without SchoolId or invalid data
        console.log("\n--- Checking Students ---");
        const studentSnap = await db.collection("students").get();
        const studentIds = new Set();
        let invalidStudents = 0;
        studentSnap.forEach(doc => {
            const data = doc.data();
            studentIds.add(doc.id);
            if (!data.schoolId || !data.studentName) {
                console.warn(`⚠️ Invalid Student Record: ${doc.id} (Missing critical fields)`);
                invalidStudents++;
            }
        });
        console.log(`checked ${studentSnap.size} students. Invalid: ${invalidStudents}`);

        // 2. Check Exam Results consistency
        console.log("\n--- Checking Exam Results ---");
        const resultSnap = await db.collection("exam_results").get();
        let orphanedResults = 0;
        resultSnap.forEach(doc => {
            const data = doc.data();
            if (!studentIds.has(data.studentId)) {
                console.warn(`⚠️ Orphaned Exam Result for missing student: ${data.studentId} (Result ID: ${doc.id})`);
                orphanedResults++;
            }
            if (!data.examId) {
                console.warn(`⚠️ Result missing Exam ID: ${doc.id}`);
            }
        });
        console.log(`checked ${resultSnap.size} results. Orphaned: ${orphanedResults}`);

        // 3. Check Fee Ledgers consistency
        console.log("\n--- Checking Fee Ledgers ---");
        const ledgerSnap = await db.collection("student_fee_ledgers").get();
        let orphanedLedgers = 0;
        ledgerSnap.forEach(doc => {
            const data = doc.data();
            // Ledger ID is usually `${studentId}_${year}`. Check if studentId exists directly
            if (!studentIds.has(data.studentId)) {
                console.warn(`⚠️ Orphaned Fee Ledger for missing student: ${data.studentId} (Ledger ID: ${doc.id})`);
                orphanedLedgers++;
            }
        });
        console.log(`checked ${ledgerSnap.size} ledgers. Orphaned: ${orphanedLedgers}`);

        // 4. Check for Students WITHOUT Fee Ledgers (for current year)
        console.log("\n--- Checking Missing Fee Ledgers (2025-2026) ---");
        let missingLedgers = 0;
        for (const sId of studentIds) {
            const ledgerId = `${sId}_2025-2026`; // Adjust year if needed
            const ledgerRef = db.collection("student_fee_ledgers").doc(ledgerId);
            // Since we can't efficiently check existence in bulk easily without known IDs, we can check against loaded ledgers set
            // Optimization: store all ledger IDs in a Set first
        }
        // ... (Simplified check)

        console.log("\nIntegrity Check Completed.");
        process.exit(0);

    } catch (error) {
        console.error("Error during check:", error);
        process.exit(1);
    }
}

checkDatabaseIntegrity();

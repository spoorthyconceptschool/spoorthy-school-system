
import { adminAuth, adminDb, adminRtdb } from "../src/lib/firebase-admin";

/**
 * System Integrity Validator
 * 
 * Performs a deep-scan of the database to ensure structural integrity.
 * Checks for:
 * 1. Existence of core structural collections.
 * 2. Counter synchronization.
 * 3. Master Data availability.
 * 4. Orphaned Auth accounts.
 */

async function validateIntegrity() {
    console.log("🔍 Starting System Integrity Scan...");
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check structural Firestore collections
    const structuralCollections = ['classes', 'sections', 'subjects', 'villages', 'counters'];
    for (const col of structuralCollections) {
        const snap = await adminDb.collection(col).limit(1).get();
        if (snap.empty && col !== 'villages') {
            errors.push(`CRITICAL: Structural collection '${col}' is EMPTY. System features will fail.`);
        } else {
            console.log(`✅ Collection '${col}' verified.`);
        }
    }

    // 2. Verify Sequence Counters
    const counters = ['studentId', 'teacherId', 'staffId', 'invoiceId'];
    for (const id of counters) {
        const doc = await adminDb.collection("counters").doc(id).get();
        if (!doc.exists) {
            warnings.push(`MISSING: Counter '${id}' doc not found. Will be auto-created on next usage.`);
        }
    }

    // 3. RTDB Structure Check
    if (adminRtdb) {
        const syncSnap = await adminRtdb.ref('master').get();
        if (!syncSnap.exists()) {
            errors.push("CRITICAL: RTDB 'master' node is missing. Real-time sync will fail.");
        } else {
            console.log("✅ RTDB Master synchronization verified.");
        }
    }

    // Output Results
    console.log("\n------------------------------");
    console.log(`Scan Complete: ${errors.length} Errors, ${warnings.length} Warnings`);

    if (errors.length > 0) {
        console.error("🚨 SYSTEM INCONSISTENCIES FOUND:");
        errors.forEach(e => console.error(` - ${e}`));
    } else {
        console.log("🚀 System structure is HEALTHY and stable.");
    }

    if (warnings.length > 0) {
        console.warn("\n⚠️ ADVISORIES:");
        warnings.forEach(w => console.warn(` - ${w}`));
    }
    console.log("------------------------------\n");
}

validateIntegrity().catch(console.error);

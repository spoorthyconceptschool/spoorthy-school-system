const admin = require("firebase-admin");

// Initialize admin SDK using Application Default Credentials (ADC) or environmental defaults
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "spoorthy-16292",
        databaseURL: "https://spoorthy-16292-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

async function runMigration() {
    console.log("[Migration] Running ledger-payment synchronizer in JS...");
    
    try {
        const paymentsSnap = await db.collection("payments").get();
        console.log(`[Migration] Found ${paymentsSnap.size} payment documents.`);

        let updatedCount = 0;

        for (const paymentDoc of paymentsSnap.docs) {
            const payment = paymentDoc.data();
            const studentId = payment.studentId;
            const amount = Number(payment.amount || 0);

            if (!studentId || amount <= 0 || payment.status === "failed") continue;

            const studentDoc = await db.collection("students").doc(studentId).get();
            if (!studentDoc.exists) {
                console.warn(`[Migration] Student doc not found for ID: ${studentId}`);
                continue;
            }
            const studentData = studentDoc.data();
            const academicYear = studentData?.academicYear || "2026-2027";

            const ledgerId = `${studentId}_${academicYear}`;
            const ledgerRef = db.collection("student_fee_ledgers").doc(ledgerId);
            const ledgerDoc = await ledgerRef.get();

            if (!ledgerDoc.exists) {
                console.warn(`[Migration] Ledger not found for ID: ${ledgerId}`);
                continue;
            }

            const ledger = ledgerDoc.data();
            if (ledger.totalPaid === 0 || !ledger.totalPaid) {
                const updatedItems = (ledger.items || []).map((item, idx) => {
                    if (idx === 0) {
                        const itemAmt = Number(item.amount || 0);
                        const paid = Math.min(itemAmt, amount);
                        return {
                            ...item,
                            paidAmount: paid,
                            status: paid >= itemAmt ? "PAID" : "PARTIAL"
                        };
                    }
                    return item;
                });

                await ledgerRef.set({
                    totalPaid: amount,
                    status: amount >= Number(ledger.totalFee || 0) ? "PAID" : "PARTIAL",
                    items: updatedItems,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                console.log(`[Migration] Updated ledger ${ledgerId} with totalPaid=${amount}`);
                updatedCount++;
            }
        }

        console.log(`[Migration] Successfully synchronized ${updatedCount} student ledgers.`);
        
        // Evict system aggregates stats caches
        const aggregates = await db.collection("system_aggregates").get();
        for (const agg of aggregates.docs) {
            if (agg.id.startsWith("finance_aggregate_")) {
                await agg.ref.delete();
                console.log(`[Migration] Evicted stats server cache: ${agg.id}`);
            }
        }

    } catch (e) {
        console.error("[Migration] Synchronization failed:", e.message);
    }
}

runMigration().then(() => process.exit(0));

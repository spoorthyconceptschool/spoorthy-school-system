
import { adminDb } from '../src/lib/firebase-admin';

async function globalSync() {
    console.log('--- STARTING GLOBAL COLLECTION SYNC ---');
    console.log('Calculating payments per student...');

    // 1. Group ALL payments by student
    const allPayments = await adminDb.collection('payments').get();
    const paymentsByStudent: Record<string, number> = {};

    allPayments.forEach(d => {
        const p = d.data();
        const sid = p.studentId;
        const amt = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount || "0").replace(/[^0-9.-]/g, "")) || 0;
        paymentsByStudent[sid] = (paymentsByStudent[sid] || 0) + amt;
    });

    console.log(`Processing ${Object.keys(paymentsByStudent).length} students...`);

    // 2. Update Ledgers for these students
    let updateCount = 0;
    for (const sid of Object.keys(paymentsByStudent)) {
        const totalPaid = paymentsByStudent[sid];
        const year = '2026-2027'; // Assuming current year for all payments for now
        const ledgerRef = adminDb.collection('student_fee_ledgers').doc(`${sid}_${year}`);

        await ledgerRef.set({
            totalPaid: totalPaid,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        updateCount++;
    }

    console.log(`Successfully synced ${updateCount} ledgers!`);
    process.exit(0);
}

globalSync().catch(console.error);


import { adminDb } from '../src/lib/firebase-admin';

async function findMissingMatches() {
    console.log('--- FINDING DISCREPANCIES ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const snap = await adminDb.collection('payments').where('createdAt', '>=', today).get();

    for (const d of snap.docs) {
        const p = d.data();
        const sid = p.studentId;
        const year = p.academicYear || '2026-2027';
        const lid = `${sid}_${year}`;
        const lsnap = await adminDb.collection('student_fee_ledgers').doc(lid).get();
        const lpaid = lsnap.exists ? (lsnap.data()?.totalPaid || 0) : 0;

        if (lpaid < p.amount) {
            console.log(`MISMATCH: PayDoc:${d.id} | Student:${sid} | PayAmt:${p.amount} | LedgerPaid:${lpaid}`);
        }
    }
    process.exit(0);
}

findMissingMatches().catch(console.error);

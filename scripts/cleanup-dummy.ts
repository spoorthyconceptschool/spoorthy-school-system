
import { adminDb } from '../src/lib/firebase-admin';

async function cleanup() {
    console.log('--- STARTING CLEANUP OF DUMMY DATA ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const snap = await adminDb.collection('payments').where('createdAt', '>=', today).get();

    let deletedCount = 0;
    for (const d of snap.docs) {
        const val = d.data().amount;
        if (val > 1000000) { // Anything over 10L today is likely dummy/test
            console.log('Deleting huge payment:', d.id, '| student:', d.data().studentName, '| amount:', val);
            await d.ref.delete();
            deletedCount++;
        }
    }
    console.log('Deleted payments count:', deletedCount);

    // 2. Fix ledgers with weird huge paid values
    const ledgersSnap = await adminDb.collection('student_fee_ledgers').get();
    let fixedLedgerCount = 0;
    for (const d of ledgersSnap.docs) {
        if (d.data().totalPaid > 1000000) {
            console.log('Resetting huge ledger paid value:', d.id);
            await d.ref.update({ totalPaid: 0, status: 'PENDING' });
            fixedLedgerCount++;
        }
    }
    console.log('Fixed ledgers count:', fixedLedgerCount);
    process.exit(0);
}

cleanup().catch(e => {
    console.error(e);
    process.exit(1);
});


import { adminDb } from '../src/lib/firebase-admin';

async function testPayment() {
    console.log('--- TEST PAYMENT START ---');
    const studentId = 'SHS1014';
    const yearId = '2026-2027';
    const ledgerRef = adminDb.collection('student_fee_ledgers').doc(`${studentId}_${yearId}`);

    const before = await ledgerRef.get();
    console.log('Before TotalPaid:', before.data()?.totalPaid || 0);

    const amount = 500;
    await adminDb.runTransaction(async (transaction) => {
        const snap = await transaction.get(ledgerRef);
        const currentPaid = snap.exists ? (snap.data()?.totalPaid || 0) : 0;
        transaction.set(ledgerRef, {
            totalPaid: currentPaid + amount,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    });

    const after = await ledgerRef.get();
    console.log('After TotalPaid:', after.data()?.totalPaid || 0);
    console.log('--- TEST PAYMENT END ---');
    process.exit(0);
}

testPayment().catch(e => {
    console.error(e);
    process.exit(1);
});

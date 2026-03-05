
import { adminDb } from '../src/lib/firebase-admin';

async function verifyMatching() {
    console.log('--- STARTING VERIFICATION ---');
    const paymentsSnap = await adminDb.collection('payments').get();
    let paymentSum = 0;
    paymentsSnap.forEach(d => {
        const a = d.data().amount;
        paymentSum += typeof a === 'number' ? a : parseFloat(String(a).replace(/[^0-9.-]/g, '')) || 0;
    });

    const ledgersSnap = await adminDb.collection('student_fee_ledgers').get();
    let ledgerPaidSum = 0;
    let ledgerFeeSum = 0;
    ledgersSnap.forEach(d => {
        const data = d.data();
        ledgerPaidSum += (data.totalPaid || 0);
        ledgerFeeSum += (data.totalFee || 0);
    });

    console.log('Total Payments Recorded (Collection History):', Math.round(paymentSum));
    console.log('Total Payments Counted (Ledgers):', Math.round(ledgerPaidSum));
    console.log('Discrepancy (Missing/Unassigned Payments):', Math.round(paymentSum - ledgerPaidSum));
    console.log('Remaining School Balance (To be Collected):', Math.round(ledgerFeeSum - ledgerPaidSum));
    process.exit(0);
}

verifyMatching().catch(e => {
    console.error(e);
    process.exit(1);
});


import { adminDb } from '../src/lib/firebase-admin';

async function audit() {
    console.log('--- STARTING AUDIT ---');

    // 1. Check Today Collection
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentsSnap = await adminDb.collection('payments').where('createdAt', '>=', today).get();

    let totalToday = 0;
    let counts = { numerics: 0, strings: 0 };
    let hugeDocs = [];

    paymentsSnap.forEach(d => {
        const data = d.data();
        let amt = data.amount;
        if (typeof amt === 'number') {
            counts.numerics++;
        } else {
            counts.strings++;
            amt = parseFloat(String(amt || "0").replace(/[^0-9.-]/g, "")) || 0;
        }
        totalToday += amt;
        if (amt > 100000) {
            hugeDocs.push({ id: d.id, student: data.studentName, amount: amt });
        }
    });

    console.log('Today Collection (Sum):', totalToday);
    console.log('Total Today Payments:', paymentsSnap.size);
    console.log('Data Types:', counts);
    console.log('Huge Payments (>1L):', hugeDocs.slice(0, 5));

    // 2. Check Ledgers
    const ledgersSnap = await adminDb.collection('student_fee_ledgers').get();
    let totalFeeAcrossAll = 0;
    let totalPaidAcrossAll = 0;
    let zeroFeeLedgers = 0;

    ledgersSnap.forEach(d => {
        const data = d.data();
        totalFeeAcrossAll += (data.totalFee || 0);
        totalPaidAcrossAll += (data.totalPaid || 0);
        if (!(data.totalFee > 0)) {
            zeroFeeLedgers++;
        }
    });

    console.log('--- LEDGER SUMMARY ---');
    console.log('Total All Ledgers:', ledgersSnap.size);
    console.log('Zero Fee Ledgers:', zeroFeeLedgers);
    console.log('Total Ledger Fees Sum:', totalFeeAcrossAll);
    console.log('Total Ledger Paid Sum:', totalPaidAcrossAll);
    console.log('Balance (Fee - Paid):', totalFeeAcrossAll - totalPaidAcrossAll);

    // 3. Check for specific student overlap (Do payments actually subtract?)
    // (Logic check on recent student)
    const recentLedger = ledgersSnap.docs[0];
    if (recentLedger) {
        console.log('Recent Ledger Sample:', JSON.stringify(recentLedger.data(), null, 2));
    }

    process.exit(0);
}

audit().catch(e => {
    console.error(e);
    process.exit(1);
});

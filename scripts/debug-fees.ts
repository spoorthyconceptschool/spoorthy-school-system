import { adminDb } from "../src/lib/firebase-admin";
import * as fs from 'fs';

async function checkData() {
    const payments = await adminDb.collection("payments").orderBy("createdAt", "desc").limit(10).get();
    const paymentResults = [];
    payments.forEach(doc => {
        const data = doc.data();
        paymentResults.push({
            id: doc.id,
            amount: data.amount,
            type: typeof data.amount,
            method: data.method
        });
    });

    const ledgers = await adminDb.collection("student_fee_ledgers").limit(10).get();
    const ledgerResults = [];
    ledgers.forEach(doc => {
        const data = doc.data();
        ledgerResults.push({
            id: doc.id,
            totalPaid: data.totalPaid,
            type: typeof data.totalPaid
        });
    });

    const final = { payments: paymentResults, ledgers: ledgerResults };
    fs.writeFileSync('./debug_output.json', JSON.stringify(final, null, 2));
}

checkData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

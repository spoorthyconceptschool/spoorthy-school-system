import { adminDb } from "../src/lib/firebase-admin";
import * as fs from 'fs';

async function checkSpecific() {
    const studentId = "SHS1199";
    const yearId = "2026-2027";
    const ledgerId = `${studentId}_${yearId}`;

    const ledger = await adminDb.collection("student_fee_ledgers").doc(ledgerId).get();
    const payments = await adminDb.collection("payments").where("studentId", "==", studentId).get();

    const res = {
        ledgerId,
        exists: ledger.exists,
        data: ledger.data(),
        payments: payments.docs.map(d => ({ id: d.id, ...d.data() }))
    };

    fs.writeFileSync('./specific_debug.json', JSON.stringify(res, null, 2));
}

checkSpecific().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

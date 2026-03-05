import { adminDb } from "../src/lib/firebase-admin";
import * as fs from 'fs';

async function checkOld() {
    const studentId = "SHS1199";
    const yearId = "2025-2026";
    const ledgerId = `${studentId}_${yearId}`;

    const ledger = await adminDb.collection("student_fee_ledgers").doc(ledgerId).get();

    fs.writeFileSync('./old_ledger_check.json', JSON.stringify({
        id: ledgerId,
        exists: ledger.exists,
        data: ledger.data()
    }, null, 2));
}

checkOld().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

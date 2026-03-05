import { adminDb } from "../src/lib/firebase-admin";
import * as fs from 'fs';

async function checkBunny() {
    const studentId = "SHS0001";
    const payments = await adminDb.collection("payments").where("studentId", "==", studentId).get();
    const res = payments.docs.map(d => ({ id: d.id, ...d.data() }));
    fs.writeFileSync('./bunny_payments.json', JSON.stringify(res, null, 2));
}

checkBunny().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

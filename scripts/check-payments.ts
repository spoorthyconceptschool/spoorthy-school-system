import { adminDb } from "../src/lib/firebase-admin";

async function checkPayments() {
    const snap = await adminDb.collection("payments").limit(10).get();
    console.log("Total payments checked: " + snap.size);
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`Doc: ${doc.id}, Amount: ${data.amount}, Type: ${typeof data.amount}`);
    });
}

checkPayments().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

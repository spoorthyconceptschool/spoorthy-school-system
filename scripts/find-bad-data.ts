import { adminDb } from "../src/lib/firebase-admin";

async function findBadData() {
    const payments = await adminDb.collection("payments").get();
    let stringAmounts = 0;
    let missingAmounts = 0;
    let totalDocs = payments.size;

    payments.forEach(doc => {
        const data = doc.data();
        if (typeof data.amount === 'string') {
            stringAmounts++;
        } else if (data.amount === undefined || data.amount === null) {
            missingAmounts++;
        }
    });

    console.log(`Total Docs: ${totalDocs}`);
    console.log(`String Amounts: ${stringAmounts}`);
    console.log(`Missing Amounts: ${missingAmounts}`);
}

findBadData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

import { adminDb } from "../src/lib/firebase-admin";

async function simulateAggregation() {
    const colRef = adminDb.collection("payments");
    const snap = await colRef.orderBy("createdAt", "desc").limit(2000).get();

    let total = 0;
    let online = 0;
    let cash = 0;

    console.log(`Snapshot Size: ${snap.size}`);

    snap.docs.forEach(doc => {
        const data = doc.data();
        const rawAmt = data.amount;
        // EXACT LOGIC FROM page.tsx
        const amt = typeof rawAmt === 'number'
            ? rawAmt
            : parseFloat(String(rawAmt || "0").replace(/[^0-9.-]/g, "")) || 0;

        const method = (data.method || "").toLowerCase();

        total += amt;
        if (method === "cash") {
            cash += amt;
        } else if (["razorpay", "upi", "bank_transfer", "online", "gpay", "phonepe", "bank", "neft", "rtgs", "transfer"].includes(method)) {
            online += amt;
        }

        console.log(`DocID: ${doc.id} | Method: ${method} | Amount: ${amt} | RunTotal: ${total}`);
    });

    console.log(`Final Totals -> Total: ${total}, Cash: ${cash}, Online: ${online}`);
}

simulateAggregation().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

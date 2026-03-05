
import { adminDb } from '../src/lib/firebase-admin';

async function checkCollection() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    console.log('--- DIAGNOSTIC ---');
    console.log('Server Time (ISO):', now.toISOString());
    console.log('Start of Day (ISO):', startOfDay.toISOString());

    // Check with UTC start of day
    const snap = await adminDb.collection('payments')
        .where('createdAt', '>=', startOfDay)
        .get();

    console.log(`Payments found starting from ${startOfDay.toISOString()}: ${snap.size}`);
    let total = 0;
    snap.docs.forEach(d => {
        const data = d.data();
        total += data.amount || 0;
        console.log(`- ${data.studentName}: ₹${data.amount} (Method: ${data.method}) createdAt: ${data.createdAt?.toDate().toISOString()}`);
    });
    console.log('Total:', total);

    // Also check for the last 24 hours just to see if there's a timezone issue
    const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const snap2 = await adminDb.collection('payments')
        .where('createdAt', '>=', last24)
        .get();
    console.log(`\nPayments in last 24 hours: ${snap2.size}`);
    let total24 = 0;
    snap2.docs.forEach(d => {
        total24 += d.data().amount || 0;
    });
    console.log('Total (Last 24h):', total24);

    process.exit(0);
}

checkCollection().catch(console.error);

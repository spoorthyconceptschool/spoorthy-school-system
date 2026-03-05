
import { adminDb } from '../src/lib/firebase-admin';

async function checkAggregates() {
    const snap = await adminDb.collection('system_aggregates').get();
    console.log('System Aggregates Count:', snap.size);
    snap.docs.forEach(d => console.log(`- Doc: ${d.id}`, JSON.stringify(d.data(), null, 2)));
    process.exit(0);
}

checkAggregates().catch(console.error);

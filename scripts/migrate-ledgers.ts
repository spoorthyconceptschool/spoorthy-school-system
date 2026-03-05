
import { adminDb } from '../src/lib/firebase-admin';

async function migrateLedgers() {
    console.log('--- MIGRATING LEDGER FIELDS ---');
    const snap = await adminDb.collection('student_fee_ledgers').get();
    let count = 0;
    for (const d of snap.docs) {
        const data = d.data();
        if (data.academicYearId && !data.yearId) {
            console.log(`Migrating ledger: ${d.id}`);
            await d.ref.update({ yearId: data.academicYearId });
            count++;
        }
    }
    console.log(`Migrated ${count} ledgers.`);
    process.exit(0);
}

migrateLedgers().catch(console.error);

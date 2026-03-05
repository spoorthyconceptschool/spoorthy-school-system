
import { adminDb } from '../src/lib/firebase-admin';

async function analyzeDiscrepancies() {
    console.log('--- ANALYZING DISCREPANCIES ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const snap = await adminDb.collection('payments').where('createdAt', '>=', today).get();

    let totalMismatchAmt = 0;
    let counts = { generated: 0, app: 0 };

    for (const d of snap.docs) {
        const p = d.data();
        const sid = p.studentId;
        const year = p.academicYear || '2026-2027';
        const lid = `${sid}_${year}`;
        const lsnap = await adminDb.collection('student_fee_ledgers').doc(lid).get();
        const lpaid = lsnap.exists ? (lsnap.data()?.totalPaid || 0) : 0;

        if (lpaid < p.amount) {
            const isGenerated = d.id.startsWith('PAY_');
            if (isGenerated) counts.generated++; else counts.app++;
            totalMismatchAmt += p.amount;
            console.log(`MISMATCH [${isGenerated ? 'GEN' : 'APP'}]: ID:${d.id} | Student:${sid} | PayAmt:${p.amount} | LedPaid:${lpaid}`);
        }
    }
    console.log('Summary:', { totalMismatchAmt, counts });
    process.exit(0);
}

analyzeDiscrepancies().catch(console.error);

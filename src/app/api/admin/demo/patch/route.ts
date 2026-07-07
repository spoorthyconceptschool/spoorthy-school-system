import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
    try {
        const collections = ['students', 'teachers', 'exam_results', 'student_fee_ledgers', 'payments', 'attendance_daily', 'leave_requests'];
        let log = [];

        for (const col of collections) {
            log.push(`Patching ${col}...`);
            const snapshot = await adminDb.collection(col).get();
            let batch = adminDb.batch();
            let count = 0;
            let totalUpdated = 0;

            for (const doc of snapshot.docs) {
                const data = doc.data();
                if (!data.branchId) {
                    batch.update(doc.ref, { branchId: "SHS" });
                    count++;
                    totalUpdated++;
                    if (count >= 450) {
                        await batch.commit();
                        batch = adminDb.batch();
                        count = 0;
                    }
                }
            }
            
            if (count > 0) {
                await batch.commit();
            }
            log.push(`Updated ${totalUpdated} documents in ${col}.`);
        }

        return NextResponse.json({ success: true, log });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}

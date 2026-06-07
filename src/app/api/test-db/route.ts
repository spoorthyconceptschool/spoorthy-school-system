import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
    try {
        const studentsSnap = await adminDb.collection("students").get();
        const studentMap = new Map();
        studentsSnap.forEach(doc => {
            const data = doc.data();
            const schoolId = data.schoolId || doc.id;
            studentMap.set(schoolId, data);
        });

        const ledgersSnap = await adminDb.collection("student_fee_ledgers").get();
        const batch = adminDb.batch();
        let count = 0;

        ledgersSnap.forEach(doc => {
            const data = doc.data();
            const student = studentMap.get(data.studentId);
            if (student) {
                batch.update(doc.ref, {
                    studentName: student.studentName || "Unknown",
                    parentName: student.parentName || "",
                    parentMobile: student.parentMobile || "",
                    villageName: student.villageName || "",
                    villageId: student.villageId || "",
                    sectionName: student.sectionName || ""
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, updated: count });
    } catch(e) {
        return NextResponse.json({ error: String(e) });
    }
}

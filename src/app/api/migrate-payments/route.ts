import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
    try {
        const snap = await adminDb.collection("payments").get();
        let updated = 0;
        
        for (const doc of snap.docs) {
            const data = doc.data();
            // If the schoolId matches the studentId (meaning it's an admission number)
            // or if it doesn't match the branchId.
            if (data.schoolId && data.studentId && data.schoolId === data.studentId) {
                // It's definitely wrong. Let's fix it.
                // It should be the tenant ID. We can derive it from branchId if branchId is correct, or just hardcode to "spes" if we have to, 
                // but let's check if there's a valid branchId.
                // Wait, if branchId is also wrong (because it was set to studentData.branchId || studentData.schoolId)...
                // Let's get the real student record to see its branchId
                let correctBranchId = "spes"; // Fallback
                const studentDoc = await adminDb.collection("students").doc(data.studentId).get();
                if (studentDoc.exists) {
                    const sData = studentDoc.data();
                    if (sData?.branchId) correctBranchId = sData.branchId;
                }

                await doc.ref.update({
                    schoolId: correctBranchId,
                    branchId: correctBranchId
                });
                updated++;
            }
        }
        
        return NextResponse.json({ success: true, updated });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}

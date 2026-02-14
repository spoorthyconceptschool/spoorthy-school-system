import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
        }

        const { selectedClasses, selectedVillages } = await req.json();

        // 1. Fetch ledgers
        let ledgersQuery: any = adminDb.collection("student_fee_ledgers");
        const ledgersSnap = await ledgersQuery.get();
        const ledgers = ledgersSnap.docs.map((d: any) => d.data());

        // 2. Fetch students to map schoolId -> uid
        const studentsSnap = await adminDb.collection("students").get();
        const studentMap = new Map();
        studentsSnap.docs.forEach((d: any) => {
            const data = d.data();
            if (data.schoolId && data.uid) {
                studentMap.set(data.schoolId, data.uid);
            }
        });

        const now = new Date();
        let sentCount = 0;

        const batch = adminDb.batch();

        for (const ledger of ledgers) {
            // Filter by selected classes/villages if provided
            const matchesClass = !selectedClasses || selectedClasses.length === 0 || selectedClasses.includes(ledger.classId) || selectedClasses.includes(ledger.className);
            const matchesVillage = !selectedVillages || selectedVillages.length === 0 || selectedVillages.includes(ledger.villageId) || selectedVillages.includes(ledger.villageName);

            if (!matchesClass || !matchesVillage) continue;

            // Criteria: Pending Term AND Pending Custom Fee
            const items = ledger.items || [];
            const hasPendingTerm = items.some((i: any) => i.type === 'TERM' && (i.amount - (i.paidAmount || 0)) > 0);
            const hasPendingCustom = items.some((i: any) => i.type === 'CUSTOM' && (i.amount - (i.paidAmount || 0)) > 0);

            if (hasPendingTerm || hasPendingCustom) {
                const uid = studentMap.get(ledger.studentId);
                if (uid) {
                    const notifRef = adminDb.collection("notifications").doc();
                    batch.set(notifRef, {
                        id: notifRef.id,
                        userId: uid,
                        title: "Fee Payment Reminder",
                        message: `Dear Parent, you have outstanding Term Fees and Custom Fees (Dues) for ${ledger.studentName}. Please clear the balance of ₹${(ledger.totalFee - ledger.totalPaid).toLocaleString()} at the earliest.`,
                        type: "FEE_ALERT",
                        status: "UNREAD",
                        createdAt: FieldValue.serverTimestamp()
                    });
                    sentCount++;
                }
            }
        }

        if (sentCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `Successfully sent notifications to ${sentCount} students matching criteria.`
        });

    } catch (error: any) {
        console.error("Notify API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

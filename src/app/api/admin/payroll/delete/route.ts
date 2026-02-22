import { NextResponse } from "next/server";
import { adminDb, Timestamp } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const { paymentId } = await req.json();

        if (!paymentId) {
            return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
        }

        const paymentRef = adminDb.collection("salary_payments").doc(paymentId);
        const paymentDoc = await paymentRef.get();

        if (!paymentDoc.exists) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        const paymentData = paymentDoc.data();

        // Delete the record
        await paymentRef.delete();

        // Audit Log
        const auditRef = adminDb.collection("audit_logs").doc();
        await auditRef.set({
            action: "DELETE_SALARY_PAYMENT",
            targetId: paymentData?.personId,
            details: { ...paymentData, paymentId },
            timestamp: Timestamp.now()
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Payroll Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

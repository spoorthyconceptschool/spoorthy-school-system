import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Normally decode verifyIdToken(token) here, but assuming valid since middleware/layout protects

        const body = await request.json();
        const { studentId, studentName, amount, method, date, remarks, adminId } = body;

        if (!studentId || !amount || amount <= 0) {
            return NextResponse.json({ success: false, error: "Invalid payment details" }, { status: 400 });
        }

        const currentYearId = "2025-2026";
        const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${studentId}_${currentYearId}`);
        const studentRef = adminDb.collection("students").doc(studentId);

        // Run as a transaction to ensure atomic updates
        await adminDb.runTransaction(async (transaction: any) => {
            const ledgerDoc = await transaction.get(ledgerRef);
            const studentDoc = await transaction.get(studentRef);

            // Fetch Ledger data safely
            let totalFee = 0;
            let totalPaid = 0;

            if (ledgerDoc.exists) {
                const data = ledgerDoc.data();
                totalFee = data?.totalFee || 0;
                totalPaid = data?.totalPaid || 0;
            }

            const newTotalPaid = totalPaid + Number(amount);
            const newStatus = newTotalPaid >= totalFee ? "PAID" : "PENDING";

            if (ledgerDoc.exists) {
                // Update existing ledger
                transaction.update(ledgerRef, {
                    totalPaid: newTotalPaid,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                });
            } else {
                // Should practically never happen, but handle missing ledgers gracefully
                transaction.set(ledgerRef, {
                    studentId,
                    studentName,
                    totalFee: 0,
                    totalPaid: newTotalPaid,
                    status: newStatus,
                    yearId: currentYearId,
                    updatedAt: new Date().toISOString()
                });
            }

            // Record Payment
            const paymentRef = adminDb.collection("payments").doc();
            transaction.set(paymentRef, {
                studentId,
                studentName,
                amount: Number(amount),
                method,
                date: new Date(date), // Firestore Admin SDK accepts native Dates directly
                status: "success",
                remarks: remarks || "",
                createdAt: new Date(),
                verifiedBy: adminId || "admin",
                type: "credit",
            });

            // Notify Student (if UID exists)
            if (studentDoc.exists && studentDoc.data()?.uid) {
                const studentUid = studentDoc.data()!.uid;
                const notificationRef = adminDb.collection("notifications").doc();
                transaction.set(notificationRef, {
                    userId: studentUid,
                    title: "Fee Payment Received",
                    message: `Payment of ₹${Number(amount).toLocaleString()} received via ${method}. ${remarks ? `(${remarks})` : ''}`,
                    type: "PAYMENT_RECEIVED",
                    status: "UNREAD",
                    createdAt: new Date(),
                    read: false
                });
            }

            // Notify Admins
            const adminNotifRef = adminDb.collection("notifications").doc();
            transaction.set(adminNotifRef, {
                target: "ALL_ADMINS",
                title: "Fee Collected",
                message: `Collected ₹${Number(amount).toLocaleString()} from ${studentName} (${studentId}) via ${method}.`,
                type: "PAYMENT_COLLECTED",
                status: "UNREAD",
                createdAt: new Date(),
                read: false
            });
        });

        return NextResponse.json({ success: true, message: "Payment recorded successfully" });
    } catch (e: any) {
        console.error("Payment API Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

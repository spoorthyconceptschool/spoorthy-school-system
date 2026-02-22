import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb as db, Timestamp } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            studentId,
            studentName,
            amount,
            ledger
        } = await req.json();

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            return NextResponse.json({ error: "Razorpay secret key not configured" }, { status: 500 });
        }

        // 1. Verify Signature
        const generated_signature = crypto
            .createHmac("sha256", keySecret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
        }

        // 2. Record Payment in Firestore
        const paymentData = {
            studentId,
            studentName,
            amount: Number(amount),
            method: "razorpay",
            transactionId: razorpay_payment_id,
            orderId: razorpay_order_id,
            date: Timestamp.now(),
            status: "success",
            createdAt: Timestamp.now(),
            verifiedBy: "system"
        };

        await db.collection("payments").add(paymentData);

        // 3. Update Ledger
        const currentYearId = "2025-2026";
        const ledgerRef = db.collection("student_fee_ledgers").doc(`${studentId}_${currentYearId}`);
        const ledgerSnap = await ledgerRef.get();

        if (ledgerSnap.exists) {
            const currentLedger = ledgerSnap.data() || {};
            const totalPaid = (currentLedger.totalPaid || 0) + Number(amount);
            const totalFee = currentLedger.totalFee || 0;

            await ledgerRef.update({
                totalPaid,
                status: totalPaid >= totalFee ? "PAID" : "PENDING",
                updatedAt: new Date().toISOString()
            });
        }

        // 4. Create Notifications
        try {
            // Notify Admins
            await db.collection("notifications").add({
                target: "ALL_ADMINS",
                title: "Online Payment Received",
                message: `Received ₹${Number(amount).toLocaleString()} from ${studentName} via Razorpay.`,
                type: "PAYMENT_RECEIVED",
                status: "UNREAD",
                createdAt: Timestamp.now(),
                read: false
            });

            // Notify Student (if UID mapped, optional step, skipping for simplicity or needs user mapping look up)
        } catch (e) {
            console.error("Failed to send notifications", e);
        }

        return NextResponse.json({ success: true, message: "Payment verified and recorded" });

    } catch (error: any) {
        console.error("Error verifying payment:", error);
        return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
    }
}

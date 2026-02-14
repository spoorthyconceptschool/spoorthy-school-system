import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate User (Student)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // 2. Parse Payload
        const body = await req.json();
        const { amount, paymentMethod = "ONLINE" } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
        }

        // 3. Resolve Student & Ledger
        // We need the Student ID (SHS...) to find the ledger.
        // Option A: Pass studentId in body.
        // Option B: Lookup by UID.
        // Let's use lookup for security (user can't pay for others easily without knowing ID, but better to enforce own ID).
        const studentsQuery = await adminDb.collection("students").where("uid", "==", uid).limit(1).get();
        if (studentsQuery.empty) {
            return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
        }
        const studentData = studentsQuery.docs[0].data();
        const studentId = studentData.schoolId || studentsQuery.docs[0].id;
        const studentName = studentData.studentName;
        const parentName = studentData.parentName; // For invoice
        const className = studentData.className;

        const currentYearId = "2025-2026"; // Hardcoded for MVP
        const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${studentId}_${currentYearId}`);

        // 4. Transaction: Process Payment
        const txnResult = await adminDb.runTransaction(async (t: any) => {
            const ledgerDoc = await t.get(ledgerRef);
            if (!ledgerDoc.exists) throw new Error("Fee Ledger not initialized.");

            const ledger = ledgerDoc.data();
            const items = ledger?.items || [];
            let remainingAmount = Number(amount);
            const itemsPaid: any[] = [];
            let totalPaidSoFar = ledger?.totalPaid || 0;

            // Simple Logic: Pay oldest/priority items first (Terms then Custom)
            // Or just iterate array order (usually Terms are first).
            // We'll iterate and pay off pending amounts.

            items.forEach((item: any) => {
                if (remainingAmount <= 0) return;

                const due = item.amount - (item.paidAmount || 0);
                if (due > 0) {
                    const payNow = Math.min(remainingAmount, due);
                    item.paidAmount = (item.paidAmount || 0) + payNow;
                    remainingAmount -= payNow;

                    if (item.paidAmount >= item.amount) {
                        item.status = "PAID";
                        item.paidAmount = item.amount; // Clamp
                    } else {
                        item.status = "PARTIAL";
                    }

                    itemsPaid.push({
                        itemId: item.id,
                        itemName: item.name,
                        amount: payNow
                    });
                }
            });

            if (remainingAmount > 0) {
                // Overpayment logic? For now, prevent or store as credit.
                // Preventing simple overpayment for MVP.
                // Or user just pays "Account Balance".
                // We'll allow remaining to be 0. If > 0, it means they paid more than total due?
                // Throw error?
                // throw new Error("Payment exceeds total due amount.");
                // Actually, let's just store it as "Credit" or surplus in a generic bucket if we want to be fancy.
                // For MVP, fail.
                throw new Error("Payment amount exceeds total outstanding dues.");
            }

            // Update Ledger Totals
            totalPaidSoFar += Number(amount);
            const newStatus = totalPaidSoFar >= (ledger?.totalFee || 0) ? "PAID" : "PENDING"; // Simple check

            t.set(ledgerRef, {
                items,
                totalPaid: totalPaidSoFar,
                status: newStatus,
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });

            // Create Transaction Record
            const txnId = `TXN${Date.now()}`;
            const txnRef = adminDb.collection("transactions").doc(txnId);

            const transactionData = {
                transactionId: txnId,
                studentId,
                studentName,
                amount: Number(amount),
                date: Timestamp.now(), // Firestore timestamp
                method: paymentMethod,
                status: "SUCCESS",
                itemsPaid: itemsPaid,
                academicYearId: currentYearId,
                type: "FEE_PAYMENT"
            };

            t.set(txnRef, transactionData);

            return { txnId, transactionData };
        });

        return NextResponse.json({
            success: true,
            transactionId: txnResult.txnId,
            message: "Payment processed successfully."
        });

    } catch (error: any) {
        console.error("Payment API Error:", error);
        return NextResponse.json({ error: error.message || "Payment processing failed" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { notifyManagerActionServer } from "@/lib/notifications-server";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        let actorRole = "ADMIN";
        let actorName = "Admin";
        let actorUid = "";

        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split("Bearer ")[1];
            try {
                const decoded = await adminAuth.verifyIdToken(token);
                actorUid = decoded.uid;
                const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
                if (userDoc.exists()) {
                    actorRole = userDoc.data()?.role || "ADMIN";
                    actorName = userDoc.data()?.name || decoded.name || "Manager";
                }
            } catch (e) {
                console.error("Token verification failed in payroll:", e);
            }
        }

        const body = await req.json();
        const { paymentId, personId, personType, month, year, amount, deductions, bonuses, leavesCount, method, notes, type = "SALARY" } = body;

        if (!personId || amount === undefined || !month || !year) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const baseAmount = Number(amount);
        const ded = Number(deductions) || 0;
        const bon = Number(bonuses) || 0;
        const netAmount = baseAmount - ded + bon;

        // Logic: Create or Update a record in salary_payments
        const paymentRef = paymentId
            ? adminDb.collection("salary_payments").doc(paymentId)
            : adminDb.collection("salary_payments").doc();

        const paymentData = {
            personId,
            personType,
            month,
            year,
            baseAmount: baseAmount,
            deductions: ded,
            bonuses: bon,
            leavesCount: leavesCount || 0,
            amount: netAmount, // This is the final money paid
            method,
            notes: notes || "",
            type, // Added type: SALARY, BONUS, ADVANCE, ADJUSTMENT
            createdAt: paymentId ? undefined : Timestamp.now(), // Don't overwrite createdAt on edit
            updatedAt: Timestamp.now(),
            createdBy: "ADMIN"
        };

        // Clean up paymentData for Firestore (remove undefined)
        const cleanData = JSON.parse(JSON.stringify(paymentData));
        if (paymentId) delete cleanData.createdAt;

        await paymentRef.set(cleanData, { merge: true });

        // Audit Log
        const auditRef = adminDb.collection("audit_logs").doc();
        const auditDetails = { ...cleanData, paymentId: paymentRef.id };
        await auditRef.set({
            action: paymentId ? "UPDATE_SALARY_PAYMENT" : "PAY_SALARY",
            targetId: personId,
            details: auditDetails,
            performedBy: actorRole,
            actorUid: actorUid,
            timestamp: Timestamp.now()
        });

        // Notification for Manager Action
        if (actorRole === "MANAGER") {
            await notifyManagerActionServer({
                userId: personId,
                title: paymentId ? "Salary Record Updated" : "Salary Processed",
                message: `Salary of ₹${netAmount.toLocaleString()} for ${month} ${year} has been ${paymentId ? 'updated' : 'processed'} by Manager ${actorName}.`,
                type: "FEE",
                actionBy: actorUid,
                actionByName: actorName
            });
        }

        return NextResponse.json({ success: true, paymentId: paymentRef.id, netAmount });

    } catch (error: any) {
        console.error("Payroll Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

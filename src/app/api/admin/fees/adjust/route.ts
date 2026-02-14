import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyManagerActionServer } from "@/lib/notifications-server";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Fetch actor role
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const actorRole = userDoc.data()?.role || decodedToken.role || "UNKNOWN";
        const actorName = userDoc.data()?.name || decodedToken.name || "Manager";

        if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(actorRole.toUpperCase()) && !decodedToken.email?.includes("admin")) {
            console.warn(`[Admin Fee Adjust] Forbidden access attempt by ${decodedToken.email} (${actorRole})`);
            return NextResponse.json({ error: "Insufficient Permissions" }, { status: 403 });
        }

        // 2. Parse Payload
        const body = await req.json();
        const { studentId, yearId = "2025-2026", adjustments, reason } = body;

        // adjustments: { id: string, type: 'DISCOUNT'|'OVERRIDE', value: number }[]

        if (!studentId || !adjustments || !Array.isArray(adjustments) || !reason) {
            return NextResponse.json({ error: "Invalid payload. Missing studentId, adjustments array, or reason." }, { status: 400 });
        }

        const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${studentId}_${yearId}`);

        // 3. Transaction
        await adminDb.runTransaction(async (t: FirebaseFirestore.Transaction) => {
            // Explicit cast to unknown then DocumentSnapshot to avoid TS mismatch
            const doc = await t.get(ledgerRef) as unknown as FirebaseFirestore.DocumentSnapshot;
            if (!doc.exists) throw new Error("Fee Ledger not found for this student/year.");

            const data = doc.data();
            let items = data?.items || [];
            let totalFee = 0;
            const changes: any[] = [];

            // Process Adjustments
            adjustments.forEach((adj: any) => {
                const itemIndex = items.findIndex((i: any) => i.id === adj.id);
                if (itemIndex === -1) return; // Skip if item not found

                const item = items[itemIndex];
                const originalAmount = item.amount;
                let newAmount = originalAmount;

                if (adj.type === "DISCOUNT") {
                    newAmount = Math.max(0, originalAmount - Number(adj.value));
                } else if (adj.type === "OVERRIDE") {
                    newAmount = Number(adj.value);
                }

                // Validation: Cannot reduce below paid amount
                if (newAmount < item.paidAmount) {
                    throw new Error(`Cannot reduce fee for '${item.name}' below paid amount (₹${item.paidAmount}).`);
                }

                if (newAmount !== originalAmount) {
                    items[itemIndex].amount = newAmount;
                    changes.push({
                        itemId: item.id,
                        itemName: item.name,
                        oldAmount: originalAmount,
                        newAmount: newAmount,
                        type: adj.type,
                        value: adj.value
                    });
                }
            });

            // Recalculate Totals
            totalFee = items.reduce((sum: number, i: any) => sum + i.amount, 0);
            const totalPaid = items.reduce((sum: number, i: any) => sum + i.paidAmount, 0);
            const status = totalFee <= totalPaid ? "PAID" : "PENDING";

            // Update Ledger
            t.update(ledgerRef, {
                items,
                totalFee,
                status,
                updatedAt: FieldValue.serverTimestamp()
            });

            // Create Adjustment Record
            const adjRef = adminDb.collection("fee_adjustments").doc();
            t.set(adjRef, {
                studentId,
                yearId,
                reason,
                changes,
                performedBy: decodedToken.uid || "ADMIN",
                createdAt: FieldValue.serverTimestamp()
            });

            // Audit Log
            const logRef = adminDb.collection("audit_logs").doc();
            t.set(logRef, {
                action: "ADJUST_FEE",
                actorUid: decodedToken.uid || "ADMIN",
                targetId: studentId,
                details: { reason, changesCount: changes.length },
                timestamp: FieldValue.serverTimestamp()
            });

            // Notification for Manager Action
            if (actorRole === "MANAGER") {
                // We'll run this outside the transaction if needed, but since we are in a transaction block
                // and it's just a set, we can add it to the transaction or do it after.
                // Let's do it after the transaction to be safe or add to batch/tx.
                // Actually, transactions are for atomicity. Let's do it inside as a set.
                const notifRef = adminDb.collection("notifications").doc();
                t.set(notifRef, {
                    userId: studentId,
                    title: "Fee Adjusted",
                    message: `Your fee structure has been adjusted. Reason: ${reason}. Check 'Fee Breakdown' for details.`,
                    type: "FEE",
                    status: "UNREAD",
                    createdAt: FieldValue.serverTimestamp(),
                    actionBy: decodedToken.uid,
                    actionByName: actorName
                });

                // 2. Notify Admins
                const adminNotifRef = adminDb.collection("notifications").doc();
                t.set(adminNotifRef, {
                    target: "ALL_ADMINS",
                    title: `[Manager Action] Fee Adjusted`,
                    message: `Fee structure for student ${studentId} has been adjusted by Manager ${actorName}. Reason: ${reason}`,
                    type: "FEE",
                    status: "UNREAD",
                    createdAt: FieldValue.serverTimestamp(),
                    actionBy: decodedToken.uid,
                    actionByName: actorName
                });
            }
        });

        return NextResponse.json({ success: true, message: "Fee structure updated successfully." });

    } catch (error: any) {
        console.error("Fee Adjustment Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

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
                console.error("Token verification failed in adjust-salary:", e);
            }
        }

        const body = await req.json();
        const { personId, role, amount, roleCode } = body;

        if (!personId || !role || amount === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const collectionName = role === "TEACHER" ? "teachers" : "staff";
        const fieldName = role === "TEACHER" ? "salary" : "baseSalary";

        // 1. Update the document
        await adminDb.collection(collectionName).doc(personId).update({
            [fieldName]: Number(amount),
            updatedAt: new Date().toISOString()
        });

        // 2. Create Audit Log
        await adminDb.collection("audit_logs").add({
            action: "ADJUST_SALARY",
            targetId: personId,
            targetCollection: collectionName,
            details: {
                newAmount: Number(amount),
                role,
                roleCode: roleCode || null
            },
            performedBy: actorRole,
            actorUid: actorUid,
            timestamp: Timestamp.now()
        });

        // Notification for Manager Action
        if (actorRole === "MANAGER") {
            await notifyManagerActionServer({
                userId: personId,
                title: "Salary Adjusted",
                message: `${role === 'TEACHER' ? 'Teacher' : 'Staff'} salary has been adjusted to ₹${Number(amount).toLocaleString()} by Manager ${actorName}.`,
                type: "INFO",
                actionBy: actorUid,
                actionByName: actorName
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Adjust Salary Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

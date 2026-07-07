import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Strict check: Only teachers (or admins on behalf)
        if (!decodedToken.role && !["SUPER_ADMIN", "ADMIN"].includes(decodedToken.role || "")) {
            // For now, assume any authenticated user can *request*, but we should check 'role' claim if set.
        }

        const body = await req.json();
        const { fromDate, toDate, reason, type } = body;

        if (!fromDate || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Resolve teacher's branch
        const teacherSnap = await adminDb.collection("teachers").where("uid", "==", decodedToken.uid).limit(1).get();
        let branchId = "global";
        if (!teacherSnap.empty) {
            branchId = teacherSnap.docs[0].data().branchId || "global";
        } else {
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
            if (userDoc.exists) {
                branchId = userDoc.data()?.branchId || userDoc.data()?.schoolId || "global";
            }
        }

        const leaveRef = adminDb.collection("leave_requests").doc();
        const leaveData = {
            id: leaveRef.id,
            teacherId: decodedToken.uid,
            teacherName: decodedToken.name || "Unknown Teacher", // Should ideally fetch from profile
            fromDate,
            toDate: toDate || fromDate,
            reason,
            type: type || "General",
            status: "PENDING", // PENDING -> APPROVED/REJECTED
            createdAt: FieldValue.serverTimestamp(),
            schoolId: branchId,
            branchId: branchId
        };

        await leaveRef.set(leaveData);

        // Notify Admins
        const { createServerNotification } = await import("@/lib/notifications-server");
        await createServerNotification({
            title: "New Teacher Leave Request",
            message: `${decodedToken.name || "Teacher"} requested leave: ${reason || "No reason provided"}`,
            type: "LEAVE_REQUEST",
            target: "admin",
        });

        return NextResponse.json({ success: true, message: "Leave Requested" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

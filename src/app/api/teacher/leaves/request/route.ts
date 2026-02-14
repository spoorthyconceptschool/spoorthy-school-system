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
            createdAt: FieldValue.serverTimestamp()
        };

        await leaveRef.set(leaveData);

        // TODO: Notification to Admin/TTE

        return NextResponse.json({ success: true, message: "Leave Requested" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

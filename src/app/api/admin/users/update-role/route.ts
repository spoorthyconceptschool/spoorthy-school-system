import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, Timestamp } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check if caller is ADMIN/SUPER_ADMIN
        const hasAdminRole = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.role === "admin";
        if (!hasAdminRole) {
            return NextResponse.json({ error: "Insufficient Permissions" }, { status: 403 });
        }

        const body = await req.json();
        const { targetUid, schoolId, role } = body;

        if (!targetUid || !schoolId || !role) {
            return NextResponse.json({ error: "Missing parameters: targetUid, schoolId, role" }, { status: 400 });
        }

        if (!["TEACHER", "MANAGER", "ADMIN"].includes(role)) {
            return NextResponse.json({ error: "Invalid role target" }, { status: 400 });
        }

        // 1. Update Firebase Auth Custom Claims
        await adminAuth.setCustomUserClaims(targetUid, { role });

        // 2. Update Firestore collections (users and usersBySchoolId)
        const batch = adminDb.batch();
        batch.update(adminDb.collection("users").doc(targetUid), {
            role,
            updatedAt: Timestamp.now()
        });
        batch.update(adminDb.collection("usersBySchoolId").doc(schoolId), {
            role,
            updatedAt: Timestamp.now()
        });

        // 3. Audit Log
        batch.set(adminDb.collection("audit_logs").doc(), {
            action: "UPDATE_USER_ROLE",
            actorUid: decodedToken.uid,
            targetUid,
            targetSchoolId: schoolId,
            newRole: role,
            timestamp: Timestamp.now()
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: `Successfully updated role to ${role}` });
    } catch (error: any) {
        console.error("Update User Role Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, Timestamp } from "@/lib/firebase-admin";
import { notifyManagerActionServer } from "@/lib/notifications-server";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication (This is a simplified check, ideally verify ID token)
        // In a real app, send the ID token in headers and verify it with adminAuth.verifyIdToken()
        // For this MVP, we are relying on the fact that this API is protected or internal, 
        // BUT since we assume client calls it, we should verify token.

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];

        let decodedToken;
        try {
            if (adminAuth) {
                decodedToken = await adminAuth.verifyIdToken(idToken);
            } else {
                throw new Error("Firebase Admin not initialized");
            }
        } catch (e) {
            console.error("Token verification failed:", e);
            return NextResponse.json({ error: "Invalid Token or Admin SDK missing" }, { status: 403 });
        }

        // Fetch user role
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const actorRole = userDoc.data()?.role || "UNKNOWN";
        const actorName = userDoc.data()?.name || decodedToken.name || "Manager";

        // Role check
        // if (decodedToken.role !== 'admin') ...

        const { targetId, role, reason, action } = await req.json();

        if (!targetId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        console.log(`[ADMIN ACTION] ${action} on ${role} ${targetId}`);

        if (action === "DEACTIVATE") {
            // 1. Determine Collection
            let collectionName = "students";
            if (role === "teacher") collectionName = "teachers";
            else if (["manager", "admin", "timetable_editor"].includes(role.toLowerCase())) collectionName = "users";

            // 2. Update Firestore Status
            await adminDb.collection(collectionName).doc(targetId).update({
                status: "inactive",
                deactivationReason: reason,
                updatedAt: new Date().toISOString()
            });

            // 3. Disable Auth User (if linked)
            try {
                // For system users, targetId is usually the UID
                await adminAuth.updateUser(targetId, { disabled: true });
            } catch (e) {
                console.log(`Auth user update failed for ${targetId} (non-fatal):`, e);
            }

            // 4. Notification
            if (actorRole === "MANAGER") {
                await notifyManagerActionServer({
                    userId: targetId,
                    title: "User Deactivated",
                    message: `${role} account has been deactivated by Manager ${actorName}. Reason: ${reason || 'N/A'}`,
                    type: "WARNING",
                    actionBy: decodedToken.uid,
                    actionByName: actorName
                });
            }

            return NextResponse.json({ success: true, message: "User deactivated" });
        }

        if (action === "DELETE_HARD") {
            // 1. Check Eligibility (Server Side double check)
            if (role === "student") {
                const paySnap = await adminDb.collection("payments").where("studentId", "==", targetId).limit(1).get();
                if (!paySnap.empty) {
                    return NextResponse.json({ error: "Cannot delete: Has linked payments." }, { status: 400 });
                }
            }

            // 2. Determine Collection
            let collectionName = "students";
            if (role === "teacher") collectionName = "teachers";
            else if (["manager", "admin", "timetable_editor"].includes(role.toLowerCase())) collectionName = "users";

            // 3. Delete Firestore Doc
            await adminDb.collection(collectionName).doc(targetId).delete();

            // 4. Delete Auth User
            try {
                await adminAuth.deleteUser(targetId);
            } catch (e) {
                console.log("Auth user delete failed (might verify manually)");
            }

            // 5. Remove Search Index (only relevant for students/teachers usually, but safe to call)
            await adminDb.collection("search_index").doc(targetId).delete();

            // 6. Notification
            if (actorRole === "MANAGER") {
                await notifyManagerActionServer({
                    title: "User Permanently Deleted",
                    message: `${role} account (${targetId}) has been PERMANENTLY DELETED by Manager ${actorName}. Reason: ${reason || 'N/A'}`,
                    type: "ERROR",
                    actionBy: decodedToken.uid,
                    actionByName: actorName
                });
            }

            return NextResponse.json({ success: true, message: "User permanently deleted" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

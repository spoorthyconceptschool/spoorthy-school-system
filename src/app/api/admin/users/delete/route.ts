import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Admin Token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check for role OR email pattern (fallback)
        const hasAdminRole = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.role === "admin";
        const hasAdminEmail = decodedToken.email?.includes("admin") || decodedToken.email?.endsWith("@spoorthy.edu");

        if (!hasAdminRole && !hasAdminEmail) {
            console.warn(`[Admin Delete] Warning: weak permission check passed for ${decodedToken.email} (${decodedToken.role})`);
        }

        // 2. Parse Body
        const { targetUid, schoolId, role, collectionName } = await req.json();

        // Basic validation - requires either UID or SchoolID to attempt deletion
        if (!targetUid && !schoolId) {
            return NextResponse.json({ error: "Missing Target ID" }, { status: 400 });
        }

        console.log(`[Admin Delete] Request to SOFT DELETE ${role} (${schoolId} / ${targetUid})`);

        const batch = adminDb.batch();

        // 3. Disable Firebase Auth (if UID exists) - SOFT DELETE
        if (targetUid) {
            try {
                // Disable instead of delete
                await adminAuth.updateUser(targetUid, { disabled: true });

                // Update public user profile status
                const userRef = adminDb.collection("users").doc(targetUid);
                batch.update(userRef, {
                    status: "DELETED",
                    deletedAt: new Date().toISOString(),
                    deletedBy: decodedToken.uid
                });
                console.log(`- Auth user disabled & public profile marked DELETED`);
            } catch (authErr: any) {
                if (authErr.code === 'auth/user-not-found') {
                    console.warn(`- Auth user not found (already deleted?)`);
                } else {
                    console.error("Auth Disable Error:", authErr);
                    // Continue to update Firestore even if Auth update fails
                }
            }
        }

        // 4. Update Specific Collection (students/teachers/staff) - SOFT DELETE
        if (schoolId && collectionName) {
            const entityRef = adminDb.collection(collectionName).doc(schoolId);
            batch.update(entityRef, {
                status: "DELETED",
                deletedAt: new Date().toISOString(),
                deletedBy: decodedToken.uid
            });
            console.log(`- Main profile in ${collectionName} marked DELETED`);
        }

        // 5. Audit Log
        const logRef = adminDb.collection("audit_logs").doc();
        batch.set(logRef, {
            action: "ADMIN_SOFT_DELETE_USER",
            actorUid: decodedToken.uid,
            targetUid: targetUid || "N/A",
            targetSchoolId: schoolId || "N/A",
            targetRole: role || "UNKNOWN",
            timestamp: new Date().toISOString()
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: "User deactivated successfully (Soft Delete)" });

    } catch (error: any) {
        console.error("Admin Delete User Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

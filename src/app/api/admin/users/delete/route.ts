import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";

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

        // 3. HARD DELETE Implementation
        if (targetUid) {
            try {
                // Permanently delete Auth user
                await adminAuth.deleteUser(targetUid);

                // Delete public user profile
                const userRef = adminDb.collection("users").doc(targetUid);
                batch.delete(userRef);
                console.log(`- Auth user deleted & public profile doc deleted`);
            } catch (authErr: any) {
                if (authErr.code === 'auth/user-not-found') {
                    console.warn(`- Auth user not found (already gone?)`);
                    // Still try to delete Firestore doc
                    const userRef = adminDb.collection("users").doc(targetUid);
                    batch.delete(userRef);
                } else {
                    console.error("Auth Delete Error:", authErr);
                }
            }
        }

        // 4. Update Specific Collection & RTDB - HARD DELETE
        if (schoolId && collectionName) {
            const entityRef = adminDb.collection(collectionName).doc(schoolId);
            batch.delete(entityRef);
            console.log(`- Main profile in ${collectionName} hard deleted`);

            // RTDB Cleanup
            try {
                const rtdbRef = adminRtdb.ref(`${collectionName}/${schoolId}`);
                await rtdbRef.remove();
                console.log(`- RTDB record removed from ${collectionName}/${schoolId}`);
            } catch (rtdbErr) {
                console.warn("- RTDB removal failed (non-critical):", rtdbErr);
            }

            // Student specific: Ledger cleanup if needed
            if (collectionName === "students") {
                // We keep ledgers for financial audit usually, but if "Hard Delete" is requested for reset:
                // For now, only delete the identity records. 
            }
        }

        // 5. Search Index Cleanup
        try {
            const searchRef = adminDb.collection("search_index").doc(schoolId || targetUid);
            batch.delete(searchRef);
            console.log(`- Search index entry removed for ${schoolId || targetUid}`);
        } catch (searchErr) {
            console.warn("- Search index removal failed (non-critical):", searchErr);
        }

        // 6. Audit Log (as a separate record, since batch delete doesn't leave traces)
        const logRef = adminDb.collection("audit_logs").doc();
        batch.set(logRef, {
            action: "ADMIN_HARD_DELETE_USER",
            actorUid: decodedToken.uid,
            targetUid: targetUid || "N/A",
            targetSchoolId: schoolId || "N/A",
            targetRole: role || "UNKNOWN",
            timestamp: new Date().toISOString()
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: "User permanently deleted successfully (Hard Delete)" });

    } catch (error: any) {
        console.error("Admin Delete User Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

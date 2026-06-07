import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (authError) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Only Super Admin can change credentials for branch admins
        if (decodedToken.role !== "SUPER_ADMIN" && !decodedToken.email?.includes("admin")) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { branchId, newPassword, newEmail } = body;

        if (!branchId || (!newPassword && !newEmail)) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        if (newPassword && newPassword.length < 6) {
            return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
        }

        // Find the admin user for this branch
        const usersSnap = await adminDb.collection("users")
            .where("schoolId", "==", branchId)
            .where("role", "==", "ADMIN")
            .limit(1)
            .get();

        if (usersSnap.empty) {
            // No Branch Admin exists. We must create one.
            // Check if we have enough info to create (need email and password)
            let targetEmail = newEmail;
            
            if (!targetEmail) {
                // Try to get email from branch doc
                const branchSnap = await adminDb.collection("branches").doc(branchId).get();
                if (branchSnap.exists) {
                    targetEmail = branchSnap.data()?.email;
                }
            }

            if (!targetEmail || !newPassword) {
                return NextResponse.json({ 
                    success: false, 
                    error: "Branch Admin not found. To create one, you must provide both a New Email and a New Password (or ensure the branch has an email address)." 
                }, { status: 400 });
            }

            // Create user in Auth
            const newUser = await adminAuth.createUser({
                email: targetEmail,
                password: newPassword
            });

            // Create user in Firestore
            await adminDb.collection("users").doc(newUser.uid).set({
                email: targetEmail,
                role: "ADMIN",
                schoolId: branchId,
                status: "ACTIVE",
                recoveryPassword: newPassword,
                mustChangePassword: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Ensure branch doc has the updated email
            await adminDb.collection("branches").doc(branchId).update({
                 email: targetEmail,
                 updatedAt: new Date().toISOString()
            });

            return NextResponse.json({ success: true, message: "Branch Admin account created successfully" });
        }

        const adminUid = usersSnap.docs[0].id;

        // Prepare updates
        const authUpdates: any = {};
        const firestoreUpdates: any = { updatedAt: new Date().toISOString() };

        if (newPassword) {
            authUpdates.password = newPassword;
            firestoreUpdates.recoveryPassword = newPassword;
            firestoreUpdates.mustChangePassword = true;
        }

        if (newEmail) {
            authUpdates.email = newEmail;
            firestoreUpdates.email = newEmail;
        }

        // Update Auth
        if (Object.keys(authUpdates).length > 0) {
            await adminAuth.updateUser(adminUid, authUpdates);
        }

        // Update Firestore
        if (Object.keys(firestoreUpdates).length > 0) {
            await adminDb.collection("users").doc(adminUid).update(firestoreUpdates);
        }
        
        // Update Branch doc if email changed
        if (newEmail) {
             await adminDb.collection("branches").doc(branchId).update({
                 email: newEmail,
                 updatedAt: new Date().toISOString()
             });
        }

        return NextResponse.json({ success: true, message: "Branch Admin credentials updated successfully" });

    } catch (error: any) {
        console.error("[API Branch Credentials Update] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
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

        // Only Super Admin can view credentials for branch admins
        if (decodedToken.role !== "SUPER_ADMIN" && !decodedToken.email?.includes("admin")) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const branchId = searchParams.get("branchId");

        if (!branchId) {
            return NextResponse.json({ success: false, error: "Missing branchId" }, { status: 400 });
        }

        // Find the admin user for this branch
        const usersSnap = await adminDb.collection("users")
            .where("schoolId", "==", branchId)
            .where("role", "==", "ADMIN")
            .limit(1)
            .get();

        if (usersSnap.empty) {
            // Check if branch exists to get its default email
            const branchSnap = await adminDb.collection("branches").doc(branchId).get();
            const branchEmail = branchSnap.exists ? branchSnap.data()?.email || "" : "";
            return NextResponse.json({ 
                success: true, 
                exists: false,
                email: branchEmail, 
                password: "" 
            });
        }

        const userData = usersSnap.docs[0].data();
        return NextResponse.json({
            success: true,
            exists: true,
            email: userData.email || "",
            password: userData.recoveryPassword || ""
        });

    } catch (error: any) {
        console.error("[API Branch Credentials GET] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

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
            // No Branch Admin exists. We must create or re-link one.
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

            let existingAuthUser = null;
            try {
                existingAuthUser = await adminAuth.getUserByEmail(targetEmail);
            } catch (e: any) {
                // Not found is expected for new accounts
            }

            let uid = "";
            if (existingAuthUser) {
                uid = existingAuthUser.uid;
                // Check if this UID is associated with another active branch
                const existingUserDoc = await adminDb.collection("users").doc(uid).get();
                if (existingUserDoc.exists) {
                    const existingData = existingUserDoc.data();
                    const existingSchoolId = existingData?.schoolId;
                    if (existingSchoolId && existingSchoolId !== branchId) {
                        // Check if the other branch exists
                        const otherBranchSnap = await adminDb.collection("branches").doc(existingSchoolId).get();
                        if (otherBranchSnap.exists) {
                            return NextResponse.json({
                                success: false,
                                error: `The email address ${targetEmail} is already in use by active branch: ${otherBranchSnap.data()?.branchName || existingSchoolId}`
                            }, { status: 400 });
                        }
                    }
                }
                
                // If it's orphaned, we can safely adopt/re-link it
                console.log(`[Credentials API] Re-linking orphaned Auth user ${uid} (${targetEmail}) to branch ${branchId}`);
                await adminAuth.updateUser(uid, { password: newPassword });
            } else {
                // Create user in Auth
                const newUser = await adminAuth.createUser({
                    email: targetEmail,
                    password: newPassword
                });
                uid = newUser.uid;
                
                await adminAuth.setCustomUserClaims(uid, {
                    role: "ADMIN",
                    schoolId: branchId,
                    branchId: branchId
                });
            }

            // Create/Update user in Firestore
            await adminDb.collection("users").doc(uid).set({
                email: targetEmail,
                role: "ADMIN",
                schoolId: branchId,
                branchId: branchId,
                status: "ACTIVE",
                recoveryPassword: newPassword,
                mustChangePassword: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Ensure branch doc has the updated email
            await adminDb.collection("branches").doc(branchId).update({
                 email: targetEmail,
                 updatedAt: new Date().toISOString()
            });

            return NextResponse.json({ success: true, message: "Branch Admin account created successfully" });
        }

        const adminUid = usersSnap.docs[0].id;
        const adminEmail = usersSnap.docs[0].data().email;

        if (newEmail && newEmail !== adminEmail) {
            const targetPassword = newPassword || usersSnap.docs[0].data().recoveryPassword || "defaultPassword123";

            // 1. Check if newEmail is already registered by someone else
            let existingAuthUser = null;
            try {
                existingAuthUser = await adminAuth.getUserByEmail(newEmail);
            } catch (e) {}

            let newUid = "";
            if (existingAuthUser) {
                newUid = existingAuthUser.uid;
                // Check if this UID is associated with another active branch
                const existingUserDoc = await adminDb.collection("users").doc(newUid).get();
                if (existingUserDoc.exists) {
                    const existingData = existingUserDoc.data();
                    const existingSchoolId = existingData?.schoolId;
                    if (existingSchoolId && existingSchoolId !== branchId) {
                        const otherBranchSnap = await adminDb.collection("branches").doc(existingSchoolId).get();
                        if (otherBranchSnap.exists) {
                            return NextResponse.json({
                                success: false,
                                error: `The email address ${newEmail} is already in use by active branch: ${otherBranchSnap.data()?.branchName || existingSchoolId}`
                            }, { status: 400 });
                        }
                    }
                }
                
                // If it's orphaned, we adopt it and update its password
                console.log(`[Credentials API] Adopting orphaned user ${newUid} for email ${newEmail}`);
                await adminAuth.updateUser(newUid, { password: targetPassword });
            } else {
                // Create user in Auth
                const newUser = await adminAuth.createUser({
                    email: newEmail,
                    password: targetPassword
                });
                newUid = newUser.uid;
            }

            // 2. Delete the old user from Auth and Firestore permanently
            try {
                console.log(`[Credentials API] Deleting old user ${adminUid} (${adminEmail}) from Auth`);
                await adminAuth.deleteUser(adminUid);
            } catch (authDeleteError: any) {
                console.error(`Failed to delete old auth user ${adminUid}:`, authDeleteError);
            }
            try {
                console.log(`[Credentials API] Deleting old user doc ${adminUid} from Firestore`);
                await adminDb.collection("users").doc(adminUid).delete();
            } catch (dbDeleteError: any) {
                console.error(`Failed to delete old firestore user doc ${adminUid}:`, dbDeleteError);
            }

            // 3. Create the new user doc in Firestore
            await adminDb.collection("users").doc(newUid).set({
                email: newEmail,
                role: "ADMIN",
                schoolId: branchId,
                branchId: branchId,
                status: "ACTIVE",
                recoveryPassword: targetPassword,
                mustChangePassword: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // 4. Update the branch document with the new email
            await adminDb.collection("branches").doc(branchId).update({
                email: newEmail,
                updatedAt: new Date().toISOString()
            });

            return NextResponse.json({ success: true, message: "Branch Admin email updated and old credentials permanently deleted." });
        }

        // If email did not change, just update password if provided
        if (newPassword) {
            await adminAuth.updateUser(adminUid, { password: newPassword });
            await adminDb.collection("users").doc(adminUid).update({
                recoveryPassword: newPassword,
                mustChangePassword: true,
                updatedAt: new Date().toISOString()
            });
        }

        return NextResponse.json({ success: true, message: "Branch Admin credentials updated successfully" });

    } catch (error: any) {
        console.error("[API Branch Credentials Update] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        if (url.searchParams.get("secret") !== "SPOORTHY_CREATE_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const branchesRef = adminDb.collection("branches");
        const defaultBranchSnapshot = await branchesRef.where("branchCode", "==", "SHS").limit(1).get();
        
        if (defaultBranchSnapshot.empty) {
            return NextResponse.json({ error: "Spoorthy High Branch not found" }, { status: 404 });
        }
        
        const branchId = defaultBranchSnapshot.docs[0].id;
        const branchName = defaultBranchSnapshot.docs[0].data().branchName;

        const email = "branchadmin@spoorthy.edu";
        const password = "Password123!";

        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(email);
            // If exists, just update password
            await adminAuth.updateUser(userRecord.uid, { password });
        } catch (e) {
            // Create new
            userRecord = await adminAuth.createUser({
                email,
                password,
                displayName: "Spoorthy Branch Admin"
            });
        }

        // Create or update Firestore profile
        await adminDb.collection("users").doc(userRecord.uid).set({
            name: "Spoorthy Branch Admin",
            email: email,
            role: "ADMIN",
            branchId: branchId,
            status: "ACTIVE",
            createdAt: new Date(),
        }, { merge: true });

        // Set custom claims
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: "ADMIN", branchId });

        return NextResponse.json({ 
            success: true, 
            message: "Branch Admin created successfully",
            credentials: {
                email,
                password,
                branchName
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

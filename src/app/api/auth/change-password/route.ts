import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const { newPassword } = await req.json();

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "Invalid password" }, { status: 400 });
        }

        // Update Password in Firebase Auth
        await adminAuth.updateUser(uid, {
            password: newPassword
        });

        // Update 'mustChangePassword' in Firestore AND Shadow Password
        const updateData: any = {
            mustChangePassword: false,
            recoveryPassword: newPassword // Shadow Password
        };

        // Update 'users' collection 
        await adminDb.collection("users").doc(uid).set(updateData, { merge: true });

        // Try to update specific role collections as well for redundancy/ease of access
        try {
            const userDoc = await adminDb.collection("users").doc(uid).get();
            const userData = userDoc.data();
            if (userData?.role === "STUDENT" && userData?.schoolId) {
                await adminDb.collection("students").doc(userData.schoolId).set({ recoveryPassword: newPassword }, { merge: true });
            } else if (userData?.role === "TEACHER" && userData?.schoolId) {
                await adminDb.collection("teachers").doc(userData.schoolId).set({ recoveryPassword: newPassword }, { merge: true });
            }
        } catch (e) { console.error("Failed to sync shadow password", e); }

        // Revoke refresh tokens to force re-auth? Maybe too aggressive.
        // Let's just return success.

        return NextResponse.json({ success: true, message: "Password updated" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

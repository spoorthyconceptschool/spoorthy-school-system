import { NextResponse } from "next/server";
import { adminAuth, adminDb, Timestamp } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        // 1. Verify Authentication & Token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e: any) {
            return NextResponse.json({ error: "Unauthorized: " + e.message }, { status: 401 });
        }

        // Role check: Only ADMIN, SUPER_ADMIN, MANAGER, etc. can create system users
        const allowedRoles = ["SUPER_ADMIN", "SUPERADMIN", "ADMIN", "OWNER", "DEVELOPER", "MANAGER"];
        if (!allowedRoles.includes(String(decodedToken.role || "").toUpperCase()) && !decodedToken.email?.includes("admin")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, password, role } = body;

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: "Missing required fields: name, email, password, role." }, { status: 400 });
        }

        if (!["ADMIN", "MANAGER", "TIMETABLE_EDITOR"].includes(role)) {
            return NextResponse.json({ error: "Invalid role." }, { status: 400 });
        }

        // Resolve branch ID from calling user's token or profile
        let resolvedBranchId = "global";
        if (decodedToken.role !== "SUPER_ADMIN" && decodedToken.role !== "SUPERADMIN") {
            resolvedBranchId = decodedToken.branchId || decodedToken.schoolId || "global";
            if (resolvedBranchId === "global" || !resolvedBranchId) {
                // Fallback to Firestore users lookup
                const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
                if (userDoc.exists) {
                    resolvedBranchId = userDoc.data()?.branchId || userDoc.data()?.schoolId || "global";
                }
            }
        } else if (body.branchId) {
            resolvedBranchId = body.branchId;
        }

        // 2. Create Firebase Auth User
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
        });

        const uid = userRecord.uid;

        // 3. Set Custom Claims (role + branch attributes)
        await adminAuth.setCustomUserClaims(uid, { 
            role, 
            branchId: resolvedBranchId,
            schoolId: resolvedBranchId 
        });

        // 4. Create User Profile in Firestore
        await adminDb.collection("users").doc(uid).set({
            uid,
            name,
            email,
            role,
            status: "ACTIVE",
            branchId: resolvedBranchId,
            schoolId: resolvedBranchId,
            createdAt: Timestamp.now(),
            recoveryPassword: password // Shadow password for admin
        });

        // 5. Audit Log
        await adminDb.collection("audit_logs").add({
            action: "CREATE_SYSTEM_USER",
            targetId: uid,
            branchId: resolvedBranchId,
            schoolId: resolvedBranchId,
            details: { name, email, role },
            timestamp: Timestamp.now()
        });

        return NextResponse.json({ success: true, uid });

    } catch (error: any) {
        console.error("Create System User Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

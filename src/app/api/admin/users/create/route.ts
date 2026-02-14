import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password, role } = body;

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: "Missing required fields: name, email, password, role." }, { status: 400 });
        }

        if (!["ADMIN", "MANAGER", "TIMETABLE_EDITOR"].includes(role)) {
            return NextResponse.json({ error: "Invalid role." }, { status: 400 });
        }

        // 1. Create Firebase Auth User
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
        });

        const uid = userRecord.uid;

        // 2. Set Custom Claims
        await adminAuth.setCustomUserClaims(uid, { role });

        // 3. Create User Profile in Firestore
        await adminDb.collection("users").doc(uid).set({
            uid,
            name,
            email,
            role,
            status: "ACTIVE",
            createdAt: Timestamp.now(),
            recoveryPassword: password // Shadow password for admin
        });

        // 4. Audit Log
        await adminDb.collection("audit_logs").add({
            action: "CREATE_SYSTEM_USER",
            targetId: uid,
            details: { name, email, role },
            timestamp: Timestamp.now()
        });

        return NextResponse.json({ success: true, uid });

    } catch (error: any) {
        console.error("Create System User Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

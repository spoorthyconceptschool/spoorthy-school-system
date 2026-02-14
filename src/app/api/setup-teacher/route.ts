import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET() {
    try {
        const teacherId = "TEACHER001";
        const email = `${teacherId}@spoorthy.edu`; // Matches Login Page logic
        const password = "password123";

        // 1. Create Auth User
        try {
            await adminAuth.createUser({
                uid: teacherId,
                email,
                password,
                displayName: "Demo Teacher"
            });
        } catch (e: any) {
            if (e.code === 'auth/email-already-exists' || e.code === 'auth/uid-already-exists') {
                // Update if exists (Fixing the email if it was wrong before)
                await adminAuth.updateUser(teacherId, {
                    email: email,
                    password: password
                });
            } else {
                throw e;
            }
        }

        // 2. Create DB Record
        await adminDb.collection("users").doc(teacherId).set({
            role: "TEACHER",
            email,
            name: "Demo Teacher",
            employeeId: "EMP001",
            schoolId: teacherId,
            recoveryPassword: password // Shadow Password for Admin
        }, { merge: true });

        // Also ensure it exists in 'teachers' collection if used
        await adminDb.collection("teachers").doc(teacherId).set({
            id: teacherId,
            uid: teacherId,
            name: "Demo Teacher",
            email,
            role: "TEACHER",
            recoveryPassword: password,
            createdAt: new Date().toISOString()
        }, { merge: true });

        // 3. Set Custom Claims
        await adminAuth.setCustomUserClaims(teacherId, { role: "TEACHER" });

        return NextResponse.json({ success: true, message: "Teacher Created", credentials: { email, password } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Verify Admin Role
        const hasAdminRole = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.role === "admin";
        const hasAdminEmail = decodedToken.email?.includes("admin") || decodedToken.email?.endsWith("@spoorthy.edu");

        if (!hasAdminRole && !hasAdminEmail) {
            // Check Firestore as final fallback
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
            const firestoreRole = userDoc.data()?.role;
            if (firestoreRole !== "ADMIN" && firestoreRole !== "SUPER_ADMIN") {
                return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
            }
        }

        const {
            classId,
            sectionId,
            subjectId,
            title,
            description,
            dueDate,
            yearId = "2025-2026"
        } = await req.json();

        if (!classId || !sectionId || !subjectId || !title || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch display names for Homework record
        // We use RTDB refs or just assume the frontend sends IDs that we can tag.
        // Actually, it's safer to store IDs and have student dashboard lookup or Store names for snapshotting.
        // Let's store Names for instant display.

        // Quick lookups from Firestore/RTDB would be slow here. 
        // Better: We assume the target IDs are what we filter by.

        const hwId = adminDb.collection("homework").doc().id;
        await adminDb.collection("homework").doc(hwId).set({
            id: hwId,
            yearId,
            classId, // Targeted Class ID
            sectionId, // Targeted Section ID
            subjectId, // Targeted Subject ID
            teacherId: "ADMIN",
            teacherName: "School Administration",
            isAdminPost: true,
            title,
            description,
            dueDate: dueDate || null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 3. Audit Log
        await adminDb.collection("audit_logs").add({
            action: "ADMIN_CREATE_HOMEWORK",
            actorUid: decodedToken.uid,
            details: { classId, title },
            timestamp: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true, message: "Homework Posted by Admin" });

    } catch (error: any) {
        console.error("Admin Homework Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

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
        // Assuming TTE role check or Admin
        if (!["SUPER_ADMIN", "ADMIN", "TIMETABLE_EDITOR"].includes(decodedToken.role || "")) {
            console.warn(`[Timetable Assign] Warning: weak permission check passed for ${decodedToken.email} (${decodedToken.role})`);
            // return NextResponse.json({ error: "Insufficient Permissions" }, { status: 403 });
        }

        const body = await req.json();
        const { yearId = "2025-2026", classId, assignments } = body;
        // assignments: { [subjectId]: teacherId }

        if (!classId || !assignments) {
            return NextResponse.json({ error: "Missing classId or assignments" }, { status: 400 });
        }

        const docRef = adminDb.collection("teaching_assignments").doc(`${yearId}_${classId}`);

        await docRef.set({
            yearId,
            classId,
            assignments,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: decodedToken.uid
        }, { merge: true });

        return NextResponse.json({ success: true, message: "Assignments saved" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const yearId = searchParams.get("yearId") || "2025-2026";
        const classId = searchParams.get("classId");

        if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 });

        const doc = await adminDb.collection("teaching_assignments").doc(`${yearId}_${classId}`).get();
        return NextResponse.json({
            success: true,
            data: doc.exists ? doc.data() : { assignments: {} }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

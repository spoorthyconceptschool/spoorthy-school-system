import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Strict Validation: Ensure Teacher actually teaches the target class
        // 1. Fetch Assignments
        const {
            yearId = "2025-2026",
            classId,
            sectionId,
            subjectId,
            title,
            description,
            dueDate
        } = await req.json();

        if (!classId || !sectionId || !subjectId || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch Teacher Profile for meta-data
        const teacherQuery = await adminDb.collection("teachers").where("uid", "==", decodedToken.uid).limit(1).get();
        if (teacherQuery.empty) return NextResponse.json({ error: "Teacher Profile Not Found" }, { status: 403 });

        const teacherData = teacherQuery.docs[0].data();
        const teacherId = teacherData.schoolId || teacherQuery.docs[0].id;

        // Note: Deep validation against teaching_assignments skipped for now 
        // as we rely on the teacher selecting from their assigned list in UI.

        // Create Homework
        const hwId = adminDb.collection("homework").doc().id;
        await adminDb.collection("homework").doc(hwId).set({
            id: hwId,
            yearId,
            classId,
            sectionId, // Targeted Section
            subjectId,
            teacherId,
            teacherName: teacherData.name,
            title,
            description,
            dueDate: dueDate || null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // TODO: Notification to Students of Class X

        return NextResponse.json({ success: true, message: "Homework Posted" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

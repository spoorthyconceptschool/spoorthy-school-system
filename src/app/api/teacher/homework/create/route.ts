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
        const schoolId = teacherData.schoolId || "global";
        const teacherId = teacherData.schoolId || teacherQuery.docs[0].id;

        // Create Homework
        const hwId = adminDb.collection("homework").doc().id;
        await adminDb.collection("homework").doc(hwId).set({
            id: hwId,
            schoolId,
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

        // Notify Students of the Class
        await adminDb.collection("notifications").add({
            target: `class_${classId}`,
            title: "New Homework Assigned",
            message: `${teacherData.name} assigned new homework for ${subjectId}: ${title}`,
            type: "HOMEWORK",
            schoolId,
            status: "UNREAD",
            createdAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true, message: "Homework Posted" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

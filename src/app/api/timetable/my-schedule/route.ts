import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const { uid, role = "STUDENT" } = decodedToken;
        const yearId = "2025-2026"; // Hardcoded for MVP

        let resultData: any = {};

        if (role === "STUDENT") {
            // Updated User Profile Fetch (Assume UID matches document ID for performance, fallback to query)
            let studentData: any = null;

            // Try direct fetch if possible or query
            const studentQuery = await adminDb.collection("students").where("uid", "==", uid).limit(1).get();
            if (studentQuery.empty) {
                // Check if maybe the doc ID IS the uid (legacy data structure check)
                const docSnap = await adminDb.collection("students").doc(uid).get();
                if (docSnap.exists) studentData = docSnap.data();
            } else {
                studentData = studentQuery.docs[0].data();
            }

            if (!studentData) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

            const classId = studentData.classId;
            if (!classId) return NextResponse.json({ error: "Class not assigned" }, { status: 404 });

            // Parallel Fetch: Schedule + Substitutions
            const [ttDoc, subSnap] = await Promise.all([
                adminDb.collection("class_timetables").doc(`${yearId}_${classId}`).get(),
                adminDb.collection("substitutions")
                    .where("classId", "==", classId)
                    .where("resolutionType", "in", ["SUBSTITUTE", "LEISURE"]) // Only resolved
                    .get()
            ]);

            resultData = {
                type: "STUDENT",
                classId,
                sectionId: studentData.sectionId,
                weeklySchedule: ttDoc.exists ? ttDoc.data()?.schedule || {} : {},
                substitutions: subSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
            };

        } else if (["TEACHER", "ADMIN", "SUPER_ADMIN", "TIMETABLE_EDITOR"].includes(role)) {
            // TEACHER VIEW
            const teacherQuery = await adminDb.collection("teachers").where("uid", "==", uid).limit(1).get();
            if (teacherQuery.empty) {
                return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
            }
            const teacherDoc = teacherQuery.docs[0];
            const teacher = teacherDoc.data();

            // Collect all possible IDs to handle data inconsistencies (SchoolID vs DocID)
            const possibleIds = [
                teacher.schoolId,
                teacher.teacherId,
                teacher.id,
                teacherDoc.id
            ].filter(Boolean);
            const uniqueIds = Array.from(new Set(possibleIds));

            if (uniqueIds.length === 0) return NextResponse.json({ error: "Teacher ID not found" }, { status: 500 });

            // 1. Fetch Schedules for ALL IDs
            const scheduleSnaps = await Promise.all(
                uniqueIds.map(id => adminDb.collection("teacher_schedules").doc(`${yearId}_${id}`).get())
            );

            // Merge Schedules
            let mergedSchedule: any = {};
            scheduleSnaps.forEach(snap => {
                if (snap.exists) {
                    const s = snap.data()?.schedule || {};
                    // Deep merge or simple assign? Simple assign for days is usually enough, but deep is safer for slots.
                    // Assuming no conflict (teacher can't be in two places), we just merge days.
                    for (const day in s) {
                        if (!mergedSchedule[day]) mergedSchedule[day] = {};
                        Object.assign(mergedSchedule[day], s[day]);
                    }
                }
            });

            // 2. Fetch Substitutions for ALL IDs
            const [asOriginalSnap, asSubSnap] = await Promise.all([
                adminDb.collection("substitutions").where("originalTeacherId", "in", uniqueIds).get(),
                adminDb.collection("substitutions").where("substituteTeacherId", "in", uniqueIds).get()
            ]);

            resultData = {
                type: "TEACHER",
                teacherId: uniqueIds[0], // Primary ID (SchoolID typically)
                weeklySchedule: mergedSchedule,
                substitutions: [
                    ...asOriginalSnap.docs.map((d: any) => ({ ...d.data(), role: "ORIGINAL" })),
                    ...asSubSnap.docs.map((d: any) => ({ ...d.data(), role: "SUBSTITUTE" }))
                ]
            };
        }

        return NextResponse.json({ success: true, data: resultData });

    } catch (error: any) {
        console.error("My Schedule API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

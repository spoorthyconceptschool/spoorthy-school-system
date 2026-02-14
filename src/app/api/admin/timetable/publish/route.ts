import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const { yearId, classId, schedule } = body; // schedule: { [day]: { [slotId]: { subjectId, teacherId } } }

        if (!yearId || !classId || !schedule) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch Previous Class Timetable and Involved Teachers
        const classRef = adminDb.collection("class_timetables").doc(`${yearId}_class_${classId}`);
        const classRefShort = adminDb.collection("class_timetables").doc(`${yearId}_${classId}`);

        // Try both naming conventions just in case
        const [oldDoc, oldDocShort] = await Promise.all([classRef.get(), classRefShort.get()]);
        const activeClassRef = oldDocShort.exists ? classRefShort : classRef;
        const oldSchedule = (oldDocShort.exists ? oldDocShort.data() : oldDoc.data())?.schedule || {};

        // 2. Identify all involved teachers (Old & New)
        const involvedTeachers = new Set<string>();

        // From Old Schedule
        for (const day in oldSchedule) {
            for (const slotId in oldSchedule[day]) {
                const tId = oldSchedule[day][slotId].teacherId;
                if (tId && tId !== "leisure") involvedTeachers.add(tId);
            }
        }
        // From New Schedule
        for (const day in schedule) {
            for (const slotId in schedule[day]) {
                const tId = schedule[day][slotId].teacherId;
                if (tId && tId !== "leisure") involvedTeachers.add(tId);
            }
        }

        const teacherIds = Array.from(involvedTeachers);
        const batch = adminDb.batch();

        if (teacherIds.length > 0) {
            // 3. Parallel Fetch only involved Teacher Schedules
            const tRefs = teacherIds.map(tId => adminDb.collection("teacher_schedules").doc(`${yearId}_${tId}`));
            const tSnaps = await adminDb.getAll(...tRefs);

            const teacherMap: Record<string, any> = {};
            tSnaps.forEach((snap: any, idx: number) => {
                teacherMap[teacherIds[idx]] = snap.exists ? snap.data()?.schedule || {} : {};
            });

            // 4. Update schedules (Targeted)
            for (const tId of teacherIds) {
                const currentTTimeTable = teacherMap[tId];

                // A. CLEAN: Remove any existing slots for THIS classId from this teacher
                for (const d in currentTTimeTable) {
                    for (const sId in currentTTimeTable[d]) {
                        if (currentTTimeTable[d][sId].classId === classId) {
                            delete currentTTimeTable[d][sId];
                        }
                    }
                }

                // B. ADD: Insert new slots for this classId IF teacher matches in new schedule
                for (const day in schedule) {
                    for (const slotId in schedule[day]) {
                        const cell = schedule[day][slotId];
                        if (cell.teacherId === tId) {
                            if (!currentTTimeTable[day]) currentTTimeTable[day] = {};
                            currentTTimeTable[day][slotId] = { classId, subjectId: cell.subjectId };
                        }
                    }
                }

                const tRef = adminDb.collection("teacher_schedules").doc(`${yearId}_${tId}`);
                batch.set(tRef, {
                    schedule: currentTTimeTable,
                    updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }

        // 5. Save Class Timetable
        batch.set(activeClassRef, {
            yearId,
            classId,
            schedule,
            status: "PUBLISHED",
            updatedAt: FieldValue.serverTimestamp()
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: "Timetable Published" });

    } catch (error: any) {
        console.error("Publish Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

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
        const classTimetableDoc = batch.set(activeClassRef, {
            yearId,
            classId,
            schedule,
            status: "PUBLISHED",
            updatedAt: FieldValue.serverTimestamp()
        });

        // 6. Generate Flat Timetable Entries for easier queries
        // Delete old entries for this class
        const oldEntriesSnap = await adminDb.collection("timetable_entries")
            .where("yearId", "==", yearId)
            .where("classKey", "==", classId)
            .get();
        oldEntriesSnap.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
        });

        // Fetch global settings to get start/end times
        const settingsDoc = await adminDb.collection("timetable_settings").doc("global_settings").get();
        const templates = settingsDoc.data()?.dayTemplates || {};

        // Fetch master data for class and subject names (optional but good for the flat doc)
        const [classesSnap, sectionsSnap, subjectsSnap, teachersSnap] = await Promise.all([
            adminDb.collection("classes").get(),
            adminDb.collection("sections").get(),
            adminDb.collection("subjects").get(),
            adminDb.collection("teachers").get()
        ]);

        const classesMap = new Map<string, any>(classesSnap.docs.map((d: any) => [d.id, d.data()]));
        const sectionsMap = new Map<string, any>(sectionsSnap.docs.map((d: any) => [d.id, d.data()]));
        const subjectsMap = new Map<string, any>(subjectsSnap.docs.map((d: any) => [d.id, d.data()]));
        const teachersMap = new Map<string, any>(teachersSnap.docs.map((d: any) => [d.id || d.data().schoolId, d.data()]));

        const [cId, sId] = classId.split('_');
        const className = classesMap.get(cId)?.name || cId;
        const sectionName = sectionsMap.get(sId)?.name || sId;

        for (const day in schedule) {
            const dayTemplate = templates[day]?.slots || [];
            for (const slotId in schedule[day]) {
                const cell = schedule[day][slotId];
                if (!cell.teacherId || cell.teacherId === "UNASSIGNED" || cell.teacherId === "leisure") continue;

                const slotConfig = dayTemplate.find((s: any) => String(s.id) === String(slotId));
                if (!slotConfig) continue;

                const subjectName = cell.subjectId === "leisure" ? "Leisure" : (subjectsMap.get(cell.subjectId)?.name || cell.subjectId);
                const teacherObj = teachersMap.get(cell.teacherId) || Array.from(teachersMap.values()).find((t: any) => t.schoolId === cell.teacherId || t.teacherId === cell.teacherId);
                const teacherName = teacherObj?.name || cell.teacherId;
                const actualTeacherId = teacherObj ? (teacherObj.id || teacherObj.schoolId) : cell.teacherId; // Ensure we use a reliable ID

                const entryRef = adminDb.collection("timetable_entries").doc();
                batch.set(entryRef, {
                    yearId,
                    classKey: classId,
                    class: className,
                    section: sectionName,
                    subject: subjectName,
                    subjectId: cell.subjectId,
                    teacherId: actualTeacherId,
                    teacherName: teacherName,
                    day: day,
                    period: parseInt(slotId),
                    startTime: slotConfig.startTime,
                    endTime: slotConfig.endTime,
                    createdAt: FieldValue.serverTimestamp()
                });
            }
        }

        await batch.commit();

        return NextResponse.json({ success: true, message: "Timetable Published" });

    } catch (error: any) {
        console.error("Publish Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

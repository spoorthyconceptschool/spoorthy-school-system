import { NextRequest, NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

/**
 * GET /api/admin/demo/assign-tch100-timetable
 * Seeds a full-week timetable for teacher TCH100 into timetable_entries
 * (the collection the teacher dashboard homepage uses).
 */
export async function GET(req: NextRequest) {
    try {
        // 1. Get current academic year
        const configSnap = await adminDb.collection("config").doc("academic_years").get();
        const config = configSnap.data();
        const yearId = config?.currentYear || "2025-2026";

        // 2. Find TCH100 teacher
        const teacherSnap = await adminDb.collection("teachers").where("schoolId", "==", "TCH100").limit(1).get();
        if (teacherSnap.empty) {
            return NextResponse.json({ error: "Teacher with schoolId TCH100 not found" }, { status: 404 });
        }
        const teacherDoc = teacherSnap.docs[0];
        const teacherDocId = teacherDoc.id;
        const teacherData = teacherDoc.data();
        const schoolId = teacherData.schoolId || "TCH100";
        const teacherName = teacherData.name || "Dr. Venkat Rao";

        // 3. Define periods with times
        const periodTimings: Record<number, { startTime: string; endTime: string }> = {
            1: { startTime: "08:30", endTime: "09:15" },
            2: { startTime: "09:15", endTime: "10:00" },
            3: { startTime: "10:15", endTime: "11:00" },
            4: { startTime: "11:00", endTime: "11:45" },
            5: { startTime: "12:30", endTime: "13:15" },
            6: { startTime: "13:15", endTime: "14:00" },
        };

        // 4. Class/subject assignments per day
        type PeriodAssignment = {
            classId: string; sectionId: string;
            className: string; sectionName: string;
            subjectId: string; subjectName: string;
        };

        const weekPlan: Record<string, PeriodAssignment[]> = {
            MONDAY:    [
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
                { classId: "lkg",     sectionId: "B", className: "LKG",     sectionName: "B", subjectId: "english", subjectName: "English" },
                { classId: "lkg",     sectionId: "B", className: "LKG",     sectionName: "B", subjectId: "english", subjectName: "English" },
                { classId: "class_1", sectionId: "B", className: "Class 1", sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "class_1", sectionId: "B", className: "Class 1", sectionName: "B", subjectId: "science", subjectName: "Science" },
            ],
            TUESDAY:   [
                { classId: "ukg",     sectionId: "A", className: "UKG",     sectionName: "A", subjectId: "science", subjectName: "Science" },
                { classId: "ukg",     sectionId: "A", className: "UKG",     sectionName: "A", subjectId: "science", subjectName: "Science" },
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
                { classId: "ukg",     sectionId: "B", className: "UKG",     sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "ukg",     sectionId: "B", className: "UKG",     sectionName: "B", subjectId: "science", subjectName: "Science" },
            ],
            WEDNESDAY: [
                { classId: "class_1", sectionId: "B", className: "Class 1", sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "class_1", sectionId: "B", className: "Class 1", sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "ukg",     sectionId: "B", className: "UKG",     sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "ukg",     sectionId: "B", className: "UKG",     sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "lkg",     sectionId: "B", className: "LKG",     sectionName: "B", subjectId: "english", subjectName: "English" },
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
            ],
            THURSDAY:  [
                { classId: "lkg",     sectionId: "B", className: "LKG",     sectionName: "B", subjectId: "english", subjectName: "English" },
                { classId: "ukg",     sectionId: "A", className: "UKG",     sectionName: "A", subjectId: "science", subjectName: "Science" },
                { classId: "class_1", sectionId: "B", className: "Class 1", sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "ukg",     sectionId: "B", className: "UKG",     sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
            ],
            FRIDAY:    [
                { classId: "ukg",     sectionId: "B", className: "UKG",     sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "class_1", sectionId: "B", className: "Class 1", sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
                { classId: "lkg",     sectionId: "B", className: "LKG",     sectionName: "B", subjectId: "english", subjectName: "English" },
                { classId: "ukg",     sectionId: "A", className: "UKG",     sectionName: "A", subjectId: "science", subjectName: "Science" },
                { classId: "ukg",     sectionId: "B", className: "UKG",     sectionName: "B", subjectId: "science", subjectName: "Science" },
            ],
            SATURDAY:  [
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
                { classId: "lkg",     sectionId: "B", className: "LKG",     sectionName: "B", subjectId: "english", subjectName: "English" },
                { classId: "ukg",     sectionId: "A", className: "UKG",     sectionName: "A", subjectId: "science", subjectName: "Science" },
                { classId: "class_1", sectionId: "B", className: "Class 1", sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "ukg",     sectionId: "B", className: "UKG",     sectionName: "B", subjectId: "science", subjectName: "Science" },
                { classId: "class_7", sectionId: "A", className: "Class 7", sectionName: "A", subjectId: "english", subjectName: "English" },
            ],
        };

        // 5. Delete existing entries for this teacher and year first
        const existingSnap = await adminDb.collection("timetable_entries")
            .where("teacherId", "in", ["TCH100", teacherDocId])
            .where("academicYear", "==", yearId)
            .get();

        const batch = adminDb.batch();
        existingSnap.docs.forEach((d: any) => batch.delete(d.ref));
        await batch.commit();

        // 6. Write new entries in batches (Firestore batch limit = 500)
        const entries: any[] = [];
        Object.entries(weekPlan).forEach(([day, periods]) => {
            periods.forEach((cls, idx) => {
                const period = idx + 1;
                const timing = periodTimings[period];
                entries.push({
                    day,
                    period,
                    teacherId: "TCH100",
                    teacherDocId: teacherDocId,
                    teacherName,
                    schoolId: teacherData.schoolId || "SHS",
                    academicYear: yearId,
                    classId: cls.classId,
                    sectionId: cls.sectionId,
                    className: cls.className,
                    sectionName: cls.sectionName,
                    subjectId: cls.subjectId,
                    subjectName: cls.subjectName,
                    startTime: timing.startTime,
                    endTime: timing.endTime,
                    status: "ACTIVE",
                    createdAt: FieldValue.serverTimestamp(),
                });
            });
        });

        // Write in batches of 400
        for (let i = 0; i < entries.length; i += 400) {
            const chunk = entries.slice(i, i + 400);
            const writeBatch = adminDb.batch();
            chunk.forEach(entry => {
                const ref = adminDb.collection("timetable_entries").doc();
                writeBatch.set(ref, entry);
            });
            await writeBatch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `Timetable seeded for TCH100 (${teacherName}) — year ${yearId}`,
            entriesCreated: entries.length,
            days: Object.keys(weekPlan),
        });

    } catch (error: any) {
        console.error("TCH100 timetable seed error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

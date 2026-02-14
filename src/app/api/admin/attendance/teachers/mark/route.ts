
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { date, records, markedBy, markedByName, isModification, touchedIds } = body;

        if (!date || !records) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const attId = `TEACHERS_${date}`;
        const attRef = adminDb.collection("attendance").doc(attId);

        // 1. Fetch Existing Attendance + Active Teachers (for UIDs)
        const [existingSnap, teachersSnap] = await Promise.all([
            attRef.get(),
            adminDb.collection("teachers")
                .where("status", "==", "ACTIVE")
                .get()
        ]);

        const isUpdate = existingSnap.exists;
        const oldRecords = isUpdate ? existingSnap.data()?.records || {} : {};

        const teacherMap: Record<string, string> = {}; // schoolId -> uid
        const teacherNameMap: Record<string, string> = {}; // schoolId -> Name

        teachersSnap.docs.forEach((doc: any) => {
            const data = doc.data();
            // Use schoolId as primary key if available, else doc.id
            const sid = data.schoolId || doc.id;
            if (data.status === "ACTIVE") {
                teacherMap[sid] = data.uid || "";
                teacherNameMap[sid] = data.name || "Teacher";
            }
        });

        // 2. Prepare Attendance Data
        const stats = {
            total: Object.keys(records).length,
            present: Object.values(records).filter(v => v === 'P').length,
            absent: Object.values(records).filter(v => v === 'A').length
        };

        const attendanceData: any = {
            id: attId,
            date,
            type: "TEACHERS", // Distinguish from student attendance
            markedBy,
            markedByName,
            records,
            updatedAt: Timestamp.now(),
            stats,
            isModified: isUpdate || isModification || false
        };

        if (!isUpdate) {
            attendanceData.createdAt = Timestamp.now();
        }

        // 3. Batch Write
        const batch = adminDb.batch();
        batch.set(attRef, attendanceData, { merge: true });

        // 4. Notifications
        let notifCount = 0;
        let changesCount = 0;
        let skippedCount = 0;

        Object.entries(records).forEach(([schoolId, status]) => {
            // Only process if status is valid string
            if (typeof status !== 'string') return;

            const uid = teacherMap[schoolId];
            const oldStatus = oldRecords[schoolId];
            const newStatus = status;

            const isExplicitlyTouched = touchedIds && Array.isArray(touchedIds) ? touchedIds.includes(schoolId) : false;
            const isDiffChange = !isUpdate || (oldStatus !== newStatus); // if new record, diff is true

            // Send notification if status CHANGED or explicitly touched
            if (isDiffChange || isExplicitlyTouched) {
                if (isDiffChange) changesCount++;

                if (uid) {
                    const notifRef = adminDb.collection("notifications").doc();
                    const statusText = newStatus === 'P' ? "Present" : "Absent";
                    const title = isUpdate ? "Attendance Updated" : "Attendance Marked";
                    const message = `Your attendance for ${date} has been marked as ${statusText}.`;

                    batch.set(notifRef, {
                        userId: uid,
                        title,
                        message,
                        type: "ATTENDANCE",
                        status: "UNREAD",
                        target: "teacher",
                        createdAt: Timestamp.now(),
                        metadata: {
                            date,
                            attendanceId: attId,
                            status: newStatus
                        }
                    });
                    notifCount++;
                } else {
                    skippedCount++;
                }
            }
        });

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: "Teacher attendance saved.",
            notifCount,
            changesCount,
            skippedCount
        });

    } catch (error: any) {
        console.error("Teacher Attendance API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

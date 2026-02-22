
import { NextResponse } from "next/server";
import { adminDb, adminAuth, FieldValue, Timestamp } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { date, records, markedBy, markedByName, isModification, touchedIds } = body;

        if (!date || !records) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const attId = `STAFF_${date}`;
        const attRef = adminDb.collection("attendance").doc(attId);

        // 1. Fetch Existing Attendance + Staff (for UIDs if any)
        const [existingSnap, staffSnap] = await Promise.all([
            attRef.get(),
            adminDb.collection("staff").get()
        ]);

        const isUpdate = existingSnap.exists;
        const oldRecords = isUpdate ? existingSnap.data()?.records || {} : {};

        const staffMap: Record<string, string> = {}; // schoolId -> uid
        const staffNameMap: Record<string, string> = {}; // schoolId -> Name

        staffSnap.docs.forEach((doc: any) => {
            const data = doc.data();
            // Use doc.id as schoolId equivalent for staff
            const sid = doc.id;

            // Assume staff might have UID if they have login access
            if (data.uid) {
                staffMap[sid] = data.uid;
            }
            staffNameMap[sid] = data.name || "Staff";
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
            type: "STAFF", // Distinguish from student/teacher attendance
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

            const uid = staffMap[schoolId];
            const oldStatus = oldRecords[schoolId];
            const isDiffChange = !isUpdate || (oldStatus !== status);
            const isExplicitlyTouched = touchedIds && Array.isArray(touchedIds) ? touchedIds.includes(schoolId) : false;

            if (isDiffChange) changesCount++;

            // Only send notification if changed or explicitly touched AND user has UID
            if ((isDiffChange || isExplicitlyTouched) && uid) {
                const notifRef = adminDb.collection("notifications").doc();
                const statusText = status === 'P' ? "Present" : "Absent";
                const title = isUpdate ? "Attendance Updated" : "Attendance Marked";
                const message = `Your attendance for ${date} has been marked as ${statusText}.`;

                batch.set(notifRef, {
                    userId: uid,
                    title,
                    message,
                    type: "ATTENDANCE",
                    status: "UNREAD",
                    target: "staff",
                    createdAt: Timestamp.now(),
                    metadata: {
                        date,
                        attendanceId: attId,
                        status
                    }
                });
                notifCount++;
            } else if (isDiffChange && !uid) {
                skippedCount++;
            }
        });

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: "Staff attendance saved.",
            notifCount,
            changesCount,
            skippedCount
        });

    } catch (error: any) {
        console.error("Staff Attendance API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

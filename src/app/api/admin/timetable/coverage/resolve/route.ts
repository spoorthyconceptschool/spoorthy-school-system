import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { taskId, resolutionType, substituteTeacherId, yearId = "2025-2026" } = body;
        // substituteTeacherId here is likely a School ID (e.g. T-001)

        if (!taskId || !resolutionType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const taskRef = adminDb.collection("coverage_tasks").doc(taskId);
        const existingSubsSnap = await adminDb.collection("substitutions").where("taskId", "==", taskId).get();

        await adminDb.runTransaction(async (t: any) => {
            const taskDoc = (await t.get(taskRef)) as any;
            if (!taskDoc.exists) throw new Error("Task not found");
            const task = taskDoc.data();
            if (!task) throw new Error("Task data is empty");

            const originalTeacherId = task.originalTeacherId;
            const date = task.date;
            const slotId = task.slotId;
            const classId = task.classId;
            const dayName = task.day || new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(date)).toUpperCase();

            let targetUid = null;

            // 1. If Substitute, Validate Availability AND Resolve UID
            if (resolutionType === "SUBSTITUTE" || resolutionType === "SUBSTITUTION") {
                if (!substituteTeacherId) throw new Error("Substitute Teacher ID required");

                // Check Schedule
                const subScheduleRef = adminDb.collection("teacher_schedules").doc(`${yearId}_${substituteTeacherId}`);
                const subScheduleDoc = (await t.get(subScheduleRef)) as any;
                const schedule = subScheduleDoc.data()?.schedule || {};

                if (schedule[dayName]?.[slotId]) {
                    throw new Error("Selected substitute is NOT free at this time.");
                }

                // Resolve UID for Notification
                let teacherRef;
                // Try schoolId match
                const tQuery = await adminDb.collection("teachers").where("schoolId", "==", substituteTeacherId).limit(1).get();
                if (!tQuery.empty) {
                    targetUid = tQuery.docs[0].data()?.uid;
                } else {
                    // Try docId match
                    const docSnap = await adminDb.collection("teachers").doc(substituteTeacherId).get();
                    if (docSnap.exists) targetUid = docSnap.data()?.uid;
                }
            }

            // 2. Clean up old records
            existingSubsSnap.docs.forEach((d: any) => t.delete(d.ref));

            // 3. Save Substitution Record (Using School ID for timetable engine)
            const subRef = adminDb.collection("substitutions").doc();
            t.set(subRef, {
                id: subRef.id,
                taskId,
                date,
                slotId,
                classId,
                originalTeacherId,
                substituteTeacherId: substituteTeacherId || null,
                resolutionType: (resolutionType === "SUBSTITUTION" || resolutionType === "SUBSTITUTE") ? "SUBSTITUTE" : "LEISURE",
                yearId,
                createdAt: FieldValue.serverTimestamp()
            });

            // 4. Mark Task Resolved
            t.update(taskRef, {
                status: "RESOLVED",
                resolution: {
                    type: (resolutionType === "SUBSTITUTION" || resolutionType === "SUBSTITUTE") ? "SUBSTITUTION" : "LEISURE",
                    substituteTeacherId: substituteTeacherId || null,
                    resolvedAt: FieldValue.serverTimestamp(),
                    resolvedBy: "ADMIN"
                }
            });

            // 5. Notifications
            const notifyRef = adminDb.collection("notifications");

            // Notification to Substitute Teacher 
            // We use BOTH UID (if found) and the substituteTeacherId (School ID)
            // My updated NotificationCenter listens for both.
            const teacherNotificationId = targetUid || substituteTeacherId;
            if (teacherNotificationId) {
                t.set(notifyRef.doc(), {
                    userId: teacherNotificationId,
                    type: "COVERAGE_ASSIGNED",
                    title: "New Coverage Assigned",
                    message: `You have been assigned to cover Period ${slotId} for Class ${classId} on ${date}.`,
                    data: { taskId, date, slotId, classId },
                    status: "UNREAD",
                    createdAt: FieldValue.serverTimestamp()
                });
            }

            // Notification to Students
            t.set(notifyRef.doc(), {
                type: "CLASS_COVERAGE_UPDATE",
                target: `class_${classId}`,
                title: "Schedule Change",
                message: (resolutionType === "SUBSTITUTE" || resolutionType === "SUBSTITUTION")
                    ? `Period ${slotId} on ${date} will be covered by a substitute teacher.`
                    : `Period ${slotId} on ${date} is marked as Leisure.`,
                data: { taskId, date, slotId },
                status: "UNREAD",
                createdAt: FieldValue.serverTimestamp()
            });

            // Broadcast to Admins
            t.set(notifyRef.doc(), {
                type: "COVERAGE_RESOLVED_ADMIN",
                target: "ALL_ADMINS",
                title: "Coverage Confirmed",
                message: `Coverage for Class ${classId} (Period ${slotId}) on ${date} has been finalized.`,
                status: "UNREAD",
                createdAt: FieldValue.serverTimestamp()
            });
        });

        return NextResponse.json({ success: true, message: "Coverage Assigned & Notifications Sent" });

    } catch (error: any) {
        console.error("[Coverage Resolve Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

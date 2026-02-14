import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyManagerActionServer } from "@/lib/notifications-server";

// Helper to get dates between range
function getDatesInRange(startDate: Date, endDate: Date) {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

// Helper to get Day Name (MONDAY, etc.)
function getDayName(date: Date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        if (token === "undefined") {
            return NextResponse.json({ error: "Invalid Auth Token. Please refresh page." }, { status: 401 });
        }
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Fetch actor role
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const actorRole = userDoc.data()?.role || decodedToken.role || "UNKNOWN";
        const actorName = userDoc.data()?.name || decodedToken.name || "Manager";

        const body = await req.json();
        const { leaveId, action, yearId = "2025-2026" } = body;

        if (!leaveId || !action) {
            return NextResponse.json({ error: "Missing leaveId or action" }, { status: 400 });
        }

        const leaveRef = adminDb.collection("leave_requests").doc(leaveId);
        const leaveDoc = await leaveRef.get();

        if (!leaveDoc.exists) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        const leaveData = leaveDoc.data();

        // Handle REVERT
        if (action === "REVERT") {
            const batch = adminDb.batch();
            const tasksSnap = await adminDb.collection("coverage_tasks").where("leaveRequestId", "==", leaveId).get();
            const taskIds = tasksSnap.docs.map((d: any) => d.id);

            tasksSnap.docs.forEach((d: any) => batch.delete(d.ref));

            if (taskIds.length > 0) {
                for (let i = 0; i < taskIds.length; i += 10) {
                    const chunk = taskIds.slice(i, i + 10);
                    const subsSnap = await adminDb.collection("substitutions").where("taskId", "in", chunk).get();
                    subsSnap.docs.forEach((d: any) => batch.delete(d.ref));
                }
            }

            batch.update(leaveRef, {
                status: "PENDING",
                revertedBy: decodedToken.uid,
                revertedAt: FieldValue.serverTimestamp(),
                coverageTasksCount: 0
            });

            await batch.commit();
            return NextResponse.json({ success: true, message: "Leave moved back to Pending" });
        }

        if (leaveData?.status !== "PENDING") {
            return NextResponse.json({ error: `Leave is already ${leaveData?.status}` }, { status: 400 });
        }

        // Handle REJECTION
        if (action === "REJECT") {
            await leaveRef.update({
                status: "REJECTED",
                reviewedBy: decodedToken.uid,
                reviewedAt: FieldValue.serverTimestamp()
            });

            // Notification for Manager Action
            if (actorRole === "MANAGER") {
                await notifyManagerActionServer({
                    userId: leaveData.teacherId,
                    title: "Leave Request Rejected",
                    message: `Your leave request from ${leaveData.fromDate} to ${leaveData.toDate} has been REJECTED by Manager ${actorName}.`,
                    type: "ERROR",
                    actionBy: decodedToken.uid,
                    actionByName: actorName
                });
            }

            return NextResponse.json({ success: true, message: "Leave Rejected" });
        }

        // APPROVAL with Recommendation Generation
        const applicantUid = leaveData?.teacherId;
        const fromDateStr = leaveData?.fromDate;
        const toDateStr = leaveData?.toDate;

        if (!applicantUid || !fromDateStr || !toDateStr) {
            return NextResponse.json({ error: "Invalid leave data" }, { status: 400 });
        }

        const fromDate = new Date(fromDateStr);
        const toDate = new Date(toDateStr);

        try {
            // 1. Resolve Applicant School ID
            const applicantSnap = await adminDb.collection("teachers").where("uid", "==", applicantUid).limit(1).get();
            if (applicantSnap.empty) {
                return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
            }
            const applicantData = applicantSnap.docs[0].data();
            const applicantSchoolId = applicantData.schoolId || applicantSnap.docs[0].id;
            const applicantName = applicantData.name || "Teacher";

            // 2. Fetch teacher's schedule
            const scheduleDoc = await adminDb.collection("teacher_schedules").doc(`${yearId}_${applicantSchoolId}`).get();
            const teacherSchedule = scheduleDoc.exists ? scheduleDoc.data()?.schedule || {} : {};

            if (!teacherSchedule || Object.keys(teacherSchedule).length === 0) {
                await leaveRef.update({
                    status: "APPROVED",
                    reviewedBy: decodedToken.uid,
                    reviewedAt: FieldValue.serverTimestamp(),
                    note: "No schedule found"
                });
                return NextResponse.json({ success: true, message: "Leave Approved (No schedule)" });
            }

            // 3. Fetch all potential substitutes
            const teachersSnap = await adminDb.collection("teachers").where("status", "==", "ACTIVE").get();
            const teachers = teachersSnap.docs.map((d: any) => {
                const data = d.data();
                return {
                    uid: data.uid,
                    schoolId: data.schoolId || d.id,
                    name: data.name
                };
            });

            // 4. Pre-fetch Data
            const [allSchedulesSnap, allAssignmentsSnap, otherLeavesSnap] = await Promise.all([
                adminDb.collection("teacher_schedules").get(),
                adminDb.collection("teaching_assignments").get(),
                adminDb.collection("leave_requests").where("status", "==", "APPROVED").get()
            ]);

            const scheduleMap: Record<string, any> = {};
            allSchedulesSnap.docs.forEach((d: any) => {
                const sid = d.id.split('_').pop() || d.id;
                scheduleMap[sid] = d.data()?.schedule || {};
            });

            const assignmentMap: Record<string, any> = {};
            allAssignmentsSnap.docs.forEach((d: any) => {
                const cid = d.id.split('_').pop() || d.id;
                assignmentMap[cid] = d.data()?.assignments || {};
            });

            const otherLeaves = otherLeavesSnap.docs.map((d: any) => d.data());
            const dateKeys = getDatesInRange(fromDate, toDate).map((d: Date) => d.toISOString().split('T')[0]);

            const coverageTasks: any[] = [];

            dateKeys.forEach(dateKey => {
                const dateObj = new Date(dateKey);
                const dayName = getDayName(dateObj);
                const daySchedule = teacherSchedule[dayName];

                if (daySchedule) {
                    Object.entries(daySchedule).forEach(([slotId, assign]: [string, any]) => {
                        const classId = assign?.classId;
                        if (!classId) return;

                        // Identify free candidates
                        const freeCandidates = teachers.filter((t: any) => {
                            if (t.uid === applicantUid) return false;

                            const onLeave = otherLeaves.some((ol: any) =>
                                ol.teacherId === t.uid &&
                                dateKey >= ol.fromDate &&
                                dateKey <= ol.toDate
                            );
                            if (onLeave) return false;

                            const tSched = scheduleMap[t.schoolId];
                            if (tSched?.[dayName]?.[slotId]) return false;

                            return true;
                        });

                        // 3-Tier Priority System
                        let subId = null;
                        let resType: "SUBSTITUTE" | "LEISURE" = "SUBSTITUTE";

                        const classTeachers = freeCandidates.filter((t: any) => {
                            const cAssigns = assignmentMap[classId];
                            return cAssigns && Object.values(cAssigns).includes(t.schoolId);
                        });

                        if (classTeachers.length > 0) {
                            subId = classTeachers[0].schoolId;
                            resType = "SUBSTITUTE";
                        } else if (freeCandidates.length > 0) {
                            subId = freeCandidates[0].schoolId;
                            resType = "SUBSTITUTE";
                        } else {
                            subId = null;
                            resType = "LEISURE";
                        }

                        coverageTasks.push({
                            leaveRequestId: leaveId,
                            originalTeacherId: applicantSchoolId,
                            date: dateKey,
                            day: dayName,
                            slotId: Number(slotId),
                            classId,
                            subjectId: assign.subjectId || null,
                            status: "PENDING",
                            suggestedSubstituteId: subId,
                            suggestedType: resType,
                            createdAt: FieldValue.serverTimestamp()
                        });
                    });
                }
            });

            const batch = adminDb.batch();
            batch.update(leaveRef, {
                status: "APPROVED",
                reviewedBy: decodedToken.uid,
                reviewedAt: FieldValue.serverTimestamp(),
                coverageTasksCount: coverageTasks.length,
            });

            coverageTasks.forEach(task => {
                const taskRef = adminDb.collection("coverage_tasks").doc();
                batch.set(taskRef, { id: taskRef.id, ...task });
            });

            // --- IMMEDIATE NOTIFICATIONS ---
            const notifyRef = adminDb.collection("notifications");

            // 1. Notify Original Teacher
            batch.set(notifyRef.doc(), {
                userId: applicantUid,
                type: "LEAVE_APPROVED",
                title: "Leave Approved",
                message: `Your leave request from ${fromDateStr} to ${toDateStr} has been approved.`,
                status: "UNREAD",
                createdAt: FieldValue.serverTimestamp()
            });

            // 2. Notify Admins (Broadcast)
            batch.set(notifyRef.doc(), {
                type: "ADMIN_ACTION_REQUIRED",
                target: "ALL_ADMINS",
                title: "New Coverage Needed",
                message: `${applicantName} is on leave. ${coverageTasks.length} classes need coverage resolution.`,
                data: { leaveId, teacherName: applicantName },
                status: "UNREAD",
                createdAt: FieldValue.serverTimestamp()
            });

            await batch.commit();

            // 5. Auto-update Attendance Records (if already marked)
            try {
                const attBatch = adminDb.batch();
                let hasAttUpdates = false;
                // dateKeys is already defined above
                const attRefs = dateKeys.map(d => adminDb.collection("attendance").doc(`TEACHERS_${d}`));

                if (attRefs.length > 0) {
                    const attSnaps = await adminDb.getAll(...attRefs);
                    attSnaps.forEach((snap: any) => {
                        if (snap.exists) {
                            attBatch.update(snap.ref, {
                                [`records.${applicantSchoolId}`]: 'A',
                                // Also update stats implies complexity (updating absent count). 
                                // Firestore doesn't support incrementing inside a map value easily for stats.absent without reading.
                                // But `TeacherAttendanceManager` recalculates stats on load. 
                                // To keep stats accurate in DB, we technically should tx-read-write, but explicit stats are secondary.
                                // We'll skip stats update here for simplicity/performance or rely on lazy fixes.
                                // Actually, `records` is the source of truth.
                            });
                            hasAttUpdates = true;
                        }
                    });
                    if (hasAttUpdates) await attBatch.commit();
                }
            } catch (attError) {
                console.error("Failed to auto-update attendance for leave approval:", attError);
            }

            // Notification for Manager Action on Approval
            if (actorRole === "MANAGER") {
                await notifyManagerActionServer({
                    userId: applicantUid,
                    title: "Leave Approved",
                    message: `Your leave request from ${fromDateStr} to ${toDateStr} has been APPROVED by Manager ${actorName}. ${coverageTasks.length} coverage slots proposed.`,
                    type: "SUCCESS",
                    actionBy: decodedToken.uid,
                    actionByName: actorName
                });
            }

            return NextResponse.json({
                success: true,
                message: `Leave Approved! ${coverageTasks.length} coverage slots proposed for review.`
            });

        } catch (coverageError: any) {
            console.error("[Leave Approve] Coverage generation failed:", coverageError);
            await leaveRef.update({
                status: "APPROVED",
                reviewedBy: decodedToken.uid,
                reviewedAt: FieldValue.serverTimestamp(),
                coverageError: coverageError.message
            });
            return NextResponse.json({
                success: true,
                message: "Leave Approved (Recommendation engine failed)"
            });
        }

    } catch (error: any) {
        console.error("[Leave Approve Error]:", error);
        return NextResponse.json({ error: error.message || "Failed to process leave request" }, { status: 500 });
    }
}

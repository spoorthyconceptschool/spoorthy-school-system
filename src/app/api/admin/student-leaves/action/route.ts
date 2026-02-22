
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

        // Fetch actor details
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();
        const actorName = userData?.name || decodedToken.name || "Admin";
        const actorRole = userData?.role || decodedToken.role || "ADMIN";

        // Admin/Manager only
        if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const body = await req.json();
        const { leaveId, action, reason } = body;

        if (!leaveId || !action) {
            return NextResponse.json({ error: "Missing leaveId or action" }, { status: 400 });
        }

        const leaveRef = adminDb.collection("student_leaves").doc(leaveId);
        const leaveDoc = await leaveRef.get();

        if (!leaveDoc.exists) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        const leaveData = leaveDoc.data();
        const studentUid = leaveData?.uid;
        const studentId = leaveData?.studentId; // School ID

        if (action === "APPROVE") {
            await leaveRef.update({
                status: "APPROVED",
                reviewedBy: decodedToken.uid,
                reviewedByName: actorName,
                reviewedAt: FieldValue.serverTimestamp(),
                reviewNote: reason || ""
            });

            // Auto-update Attendance to 'A'
            const { classId, sectionId, dates, fromDate, toDate, studentId: sId } = leaveData;

            if (classId && sectionId && sId) {
                const targetDates: string[] = [];
                if (dates && Array.isArray(dates) && dates.length > 0) {
                    targetDates.push(...dates);
                } else if (fromDate && toDate) {
                    let curr = new Date(fromDate);
                    const end = new Date(toDate);
                    while (curr <= end) {
                        targetDates.push(curr.toISOString().split('T')[0]);
                        curr.setDate(curr.getDate() + 1);
                    }
                }

                if (targetDates.length > 0) {
                    const batch = adminDb.batch();
                    let hasUpdates = false;

                    const activeAttRefs = targetDates.map(d =>
                        adminDb.collection("attendance").doc(`${d}_${classId}_${sectionId}`)
                    );

                    if (activeAttRefs.length > 0) {
                        const attSnaps = await adminDb.getAll(...activeAttRefs);
                        attSnaps.forEach((snap: any) => {
                            if (snap.exists) {
                                batch.update(snap.ref, {
                                    [`records.${sId}`]: 'A', // Use School ID as key
                                    [`records.${leaveData.uid}`]: 'A' // Try UID as key too just in case
                                });
                                hasUpdates = true;
                            }
                        });
                    }

                    if (hasUpdates) await batch.commit();
                }
            }

            // Notify Student
            if (studentUid) {
                await adminDb.collection("notifications").add({
                    userId: studentUid,
                    title: "Leave Approved ✅",
                    message: `Your leave request from ${leaveData?.fromDate} to ${leaveData?.toDate} has been APPROVED.`,
                    type: "LEAVE",
                    status: "UNREAD",
                    target: "student",
                    createdAt: FieldValue.serverTimestamp()
                });
            }
        } else if (action === "REJECT") {
            await leaveRef.update({
                status: "REJECTED",
                reviewedBy: decodedToken.uid,
                reviewedByName: actorName,
                reviewedAt: FieldValue.serverTimestamp(),
                reviewNote: reason || ""
            });

            // Notify Student
            if (studentUid) {
                await adminDb.collection("notifications").add({
                    userId: studentUid,
                    title: "Leave Rejected ❌",
                    message: `Your leave request from ${leaveData?.fromDate} was rejected. Reason: ${reason || "No reason provided"}`,
                    type: "LEAVE",
                    status: "UNREAD",
                    target: "student",
                    createdAt: FieldValue.serverTimestamp()
                });
            }
        } else if (action === "REVERT") {
            await leaveRef.update({
                status: "PENDING",
                revertedBy: decodedToken.uid,
                revertedAt: FieldValue.serverTimestamp()
            });
        }

        return NextResponse.json({ success: true, message: `Leave ${action.toLowerCase()}d successfully` });

    } catch (error: any) {
        console.error("Student Leave Action Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

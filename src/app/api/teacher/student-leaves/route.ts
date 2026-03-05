import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * GET Handler - Student Leaves Fetch
 * 
 * Retrieves all pending leave requests for students.
 * For teachers, it dynamically resolves their assigned classes from the 
 * Realtime Database (RTDB) and filters leaves belonging strictly to those classes.
 * 
 * @param {NextRequest} req - The incoming HTTP request.
 * @returns {Promise<NextResponse>} JSON response with leave records or error.
 */
export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Get Teacher Profile to find their ID
        const teacherUid = decodedToken.uid;
        const teacherSnap = await adminDb.collection("teachers").where("uid", "==", teacherUid).limit(1).get();
        if (teacherSnap.empty) {
            return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
        }
        const teacherData = teacherSnap.docs[0].data();
        const teacherId = teacherData.schoolId || teacherSnap.docs[0].id;

        // Fetch ALL class assignments for this teacher from RTDB
        const { adminRtdb } = require("@/lib/firebase-admin");
        const sectionsSnap = await adminRtdb.ref("master/classSections").get();
        const allSections = sectionsSnap.val() || {};

        const myAssignments = Object.values(allSections).filter((cs: any) => cs.classTeacherId === teacherId);

        if (myAssignments.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                message: "You are not assigned as a Class In-charge."
            });
        }

        // Fetch leaves for ALL assigned classes
        // Note: Firestore 'whereIn' is limited to 10 items. For schools, a teacher usually has < 10 class teacher roles.
        const classIds = Array.from(new Set(myAssignments.map((a: any) => a.classId)));

        let leavesQuery = adminDb.collection("student_leaves")
            .where("classId", "in", classIds)
            .where("status", "==", "PENDING");

        const snap = await leavesQuery.limit(50).get();

        // Robust Authorization Check: Filter in-memory to ensure section-level isolation.
        // Line 52 queries by class for performance/index reasons, but we MUST respect section boundaries.
        const docs = snap.docs
            .map((doc: any) => ({ id: doc.id, ...doc.data() }))
            .filter((d: any) =>
                myAssignments.some((a: any) => a.classId === d.classId && a.sectionId === d.sectionId)
            );

        // Sort in memory to bypass the missing Firebase generic index error
        docs.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });

        return NextResponse.json({
            success: true,
            data: docs
        });

    } catch (error: any) {
        console.error("Teacher Student Leaves Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Action for teacher to approve/noted
/**
 * POST Handler - Student Leave Action
 * 
 * Processes a teacher's decision (APPROVE/REJECT) on a student leave request.
 * If approved, it automatically marks the student as ABSENT ('A') in the 
 * attendance registry for the specified date range.
 * 
 * @param {NextRequest} req - The incoming HTTP request containing leaveId and action.
 * @returns {Promise<NextResponse>} JSON success message or error.
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        const body = await req.json();
        const { leaveId, action } = body; // action: APPROVE, REJECT

        const leaveRef = adminDb.collection("student_leaves").doc(leaveId);
        const leaveDoc = await leaveRef.get();

        if (!leaveDoc.exists) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }
        const leaveData = leaveDoc.data();

        await leaveRef.update({
            status: action,
            reviewedBy: decodedToken.uid,
            reviewedAt: new Date()
        });

        // Send Notification to Student
        if (leaveData?.uid) {
            const notifRef = adminDb.collection("notifications").doc();
            const statusText = action === "APPROVED" ? "Approved" : "Rejected";
            await notifRef.set({
                userId: leaveData.uid,
                title: `Leave request ${statusText}`,
                message: `Your leave request for ${leaveData.fromDate} to ${leaveData.toDate} has been ${statusText.toLowerCase()}.`,
                type: action === "APPROVED" ? "SUCCESS" : "ERROR",
                status: "UNREAD",
                target: "student",
                createdAt: new Date(),
                metadata: {
                    leaveId: leaveId,
                    status: action,
                    fromDate: leaveData.fromDate,
                    toDate: leaveData.toDate
                }
            });
        }

        // Auto-mark attendance as ABSENT if Approved
        if (action === "APPROVED" && leaveData) {
            const { fromDate, toDate, classId, sectionId, studentId } = leaveData;

            if (fromDate && toDate && classId && studentId) {
                const start = new Date(fromDate);
                const end = new Date(toDate);

                // Loop through each day of the leave
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    // Construct Attendance ID: YYYY-MM-DD_ClassID_SectionID
                    // Ensure matches AttendanceManager format
                    const secId = sectionId || "";
                    const attId = `${dateStr}_${classId}_${secId}`;

                    const attRef = adminDb.collection("attendance").doc(attId);
                    const attSnap = await attRef.get();

                    if (attSnap.exists) {
                        await attRef.update({
                            [`records.${studentId}`]: "A"
                        });
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: `Leave ${action}D` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

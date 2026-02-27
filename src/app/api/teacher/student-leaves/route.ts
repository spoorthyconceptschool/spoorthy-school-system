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

        // Get Teacher Profile to find their class
        const teacherUid = decodedToken.uid;
        const teacherSnap = await adminDb.collection("teachers").where("uid", "==", teacherUid).limit(1).get();
        if (teacherSnap.empty) {
            return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
        }
        const teacherData = teacherSnap.docs[0].data();
        const classId = teacherData?.classTeacherOf?.classId;
        const sectionId = teacherData?.classTeacherOf?.sectionId;

        if (!classId) {
            return NextResponse.json({
                success: true,
                data: [],
                message: "You are not assigned as a Class In-charge. Student leaves are only visible to class teachers."
            });
        }

        // Fetch leaves for this class
        let query = adminDb.collection("student_leaves")
            .where("classId", "==", classId)
            .where("status", "==", "PENDING"); // Added filter for PENDING status

        if (sectionId) {
            query = query.where("sectionId", "==", sectionId);
        }

        const snap = await query.limit(50).get();

        // Sort in memory to bypass the missing Firebase generic index error
        const docs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
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

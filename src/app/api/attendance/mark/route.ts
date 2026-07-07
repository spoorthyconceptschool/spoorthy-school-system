import { NextRequest, NextResponse } from "next/server";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";
import { EnterpriseAttendanceService } from "@/lib/services/enterprise/attendance-service";
import { adminDb, adminRtdb } from "@/lib/firebase-admin";

/**
 * Enterprise Attendance Modification Rules:
 * - Handled by backend only.
 * - Time window bounds strictly applied inside EnterpriseAttendanceService.
 * - Modifications locked.
 */
export async function POST(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN', 'TEACHER'], async (req, user) => {
        try {
            const body = await req.json();
            const { classId, sectionId, date, records } = body;

            if (!classId || !sectionId || !date || !records) {
                return NextResponse.json({ success: false, error: "Validation Failed: Missing required fields" }, { status: 400 });
            }

            // --- STRICT CLASS TEACHER VALIDATION ---
            const userRole = (user.role || "").toUpperCase();
            if (userRole === "TEACHER") {
                // 1. Resolve Teacher ID from their UID
                const teacherSnap = await adminDb.collection("teachers").where("uid", "==", user.uid).limit(1).get();
                if (teacherSnap.empty) {
                    return NextResponse.json({ success: false, error: "Validation Failed: Teacher profile not found" }, { status: 403 });
                }
                const tProfile = teacherSnap.docs[0].data();
                const tId = tProfile.schoolId || teacherSnap.docs[0].id;

                // 2. Fetch Master Data from Realtime Database to verify Class Teacher or Subject Teacher assignment
                const [classSectionsSnap, subjectTeachersSnap] = await Promise.all([
                    adminRtdb.ref("master/classSections").once("value"),
                    adminRtdb.ref("master/subjectTeachers").once("value")
                ]);

                const classSections = classSectionsSnap.val() || {};
                const subjectTeachers = subjectTeachersSnap.val() || {};
                const classKey = `${classId}_${sectionId}`;

                let isClassTeacher = false;
                Object.values(classSections).forEach((cs: any) => {
                    if (cs.classId === classId && cs.sectionId === sectionId && cs.classTeacherId === tId && (cs.active !== false && cs.isActive !== false)) {
                        isClassTeacher = true;
                    }
                });

                let isSubjectTeacher = false;
                const subjectsObj = subjectTeachers[classKey] || {};
                if (typeof subjectsObj === 'object' && subjectsObj !== null) {
                    const teacherIds = Object.values(subjectsObj);
                    if (tId && teacherIds.includes(tId)) {
                        isSubjectTeacher = true;
                    }
                }

                if (!isClassTeacher && !isSubjectTeacher) {
                    return NextResponse.json({
                        success: false,
                        error: "Business Rule Violation: Only assigned Class Teachers or Subject Teachers for this class can submit attendance."
                    }, { status: 403 });
                }
            }
            // --- END VALIDATION ---

            // Resolve schoolId for the actor
            let actorSchoolId = "global";
            const userSnap = await adminDb.collection("users").doc(user.uid).get();
            if (userSnap.exists) {
                const uData = userSnap.data();
                // Partition by branchId (which holds the school branch ID) or fallback to schoolId
                actorSchoolId = uData?.branchId || uData?.schoolId || "global";
            }

            // Route all logic to our enterprise service
            const result = await EnterpriseAttendanceService.markAttendance(
                date,
                classId,
                sectionId,
                records,
                user.uid,
                actorSchoolId,
                body.touchedIds
            );

            return NextResponse.json({
                success: true,
                message: "Attendance securely locked and recorded.",
                data: result.stats
            });

        } catch (error: any) {
            console.error("[Enterprise Attendance] Failed to mark attendance:", error);

            // Normalize error messages explicitly for Business Rule Violations
            const isBizVio = error.message?.includes("Business Rule Violation");

            return NextResponse.json({
                success: false,
                error: isBizVio ? error.message : `System Error: ${error.message}`
            }, { status: isBizVio ? 403 : 500 });
        }
    });
}

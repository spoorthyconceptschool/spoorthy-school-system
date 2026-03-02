import { adminDb, Timestamp } from "@/lib/firebase-admin";
import { AuditService } from "./audit-service";

/**
 * Enterprise Attendance Service
 * 
 * Provides centralized backend logic for school attendance tracking across all categories
 * (Students, Teachers, and Staff). Follows a strict 3-layer architecture which ensures 
 * that all business rules are enforced exclusively on the server side.
 * 
 * Business Rules:
 * 1. Mutual Exclusivity: Only one attendance record per entity (student/staff) per day.
 * 2. Immutability: Once marked, records are considered final and read-only.
 * 3. Temporal Constraints: Attendance can only be submitted during configured school hours.
 * 4. Validation: Only active, recognized entities can have their attendance recorded.
 * 5. Privacy: No biometrics or sensitive images are persisted in the attendance stream.
 */

// Configuration for time window enforcement (24-hour format)
const SCHOOL_TIME_WINDOW = { startHour: 7, endHour: 17 };

export class EnterpriseAttendanceService {

    /**
     * Records the daily attendance for an entire class section.
     * 
     * Validates the submission time against school hours, verifies that the attendance
     * hasn't already been marked for this section/date, and ensures all student IDs
     * correspond to active students currently enrolled in that class.
     * 
     * @param date - The target date in ISO YYYY-MM-DD format.
     * @param classId - Unique identifier for the class (e.g., 'CLASS_1').
     * @param sectionId - Unique identifier for the section (e.g., 'SEC_A').
     * @param records - A dictionary mapping student IDs to their status ('P' for Present, 'A' for Absent).
     * @param markedBy - The UID of the authenticated user submitting the attendance.
     * @returns A promise resolving to an object containing success status and statistics.
     * @throws Error if outside time window, section already marked, or database failure.
     */
    static async markAttendance(date: string, classId: string, sectionId: string, records: Record<string, 'P' | 'A'>, markedBy: string) {
        // Enforce time window
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < SCHOOL_TIME_WINDOW.startHour || currentHour > SCHOOL_TIME_WINDOW.endHour) {
            throw new Error(`Business Rule Violation: Attendance can only be marked during school hours (${SCHOOL_TIME_WINDOW.startHour}:00 - ${SCHOOL_TIME_WINDOW.endHour}:00).`);
        }

        const attId = `${date}_${classId}_${sectionId}`;
        const attRef = adminDb.collection("attendance_daily").doc(attId);

        // Fetch existing record and map active students in parallel
        const [existingSnap, studentsSnap] = await Promise.all([
            attRef.get(),
            adminDb.collection("students")
                .where("classId", "==", classId)
                .where("sectionId", "==", sectionId)
                .where("status", "==", "ACTIVE")
                .get()
        ]);

        // Enforce Read-Only After Marking Rule
        if (existingSnap.exists) {
            throw new Error("Business Rule Violation: Attendance is read-only after being marked and cannot be updated dynamically.");
        }

        // Validate and filter students (Ignore unknown persons)
        const validStudentMap: Record<string, string> = {};
        studentsSnap.docs.forEach((doc: any) => {
            validStudentMap[doc.id] = doc.data().uid;
        });

        const validatedRecords: Record<string, 'P' | 'A'> = {};
        let presentCount = 0;
        let absentCount = 0;

        for (const [studentId, status] of Object.entries(records)) {
            // Unknown persons ignored
            if (validStudentMap[studentId]) {
                validatedRecords[studentId] = status;
                if (status === 'P') presentCount++;
                if (status === 'A') absentCount++;
            }
        }

        const stats = { total: presentCount + absentCount, present: presentCount, absent: absentCount };

        // Ensure no face images are passed (clean object mapping)
        const pureAttendanceData = {
            id: attId,
            date,
            classId,
            sectionId,
            markedBy,
            records: validatedRecords,
            stats,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            isModified: false // Read-only guarantee
        };

        const batch = adminDb.batch();

        // 1. Save core attendance doc
        batch.set(attRef, pureAttendanceData);

        // 2. Append to immutable Audit Logs using centralized AuditService
        await AuditService.log({
            userId: markedBy,
            userRole: 'Teacher', // TODO: Fetch correct role mapped from user session
            action: 'MARK_ATTENDANCE',
            entityId: attId,
            entityType: 'attendance',
            oldValue: null,
            newValue: pureAttendanceData
        }, batch);

        // 3. Dispatch Notifications
        for (const [studentId, status] of Object.entries(validatedRecords)) {
            const uid = validStudentMap[studentId];
            if (uid) {
                const notifRef = adminDb.collection("notifications").doc();
                batch.set(notifRef, {
                    userId: uid,
                    title: "Attendance Marked",
                    message: `Your attendance for ${date} has been marked as ${status === 'P' ? 'Present' : 'Absent'}.`,
                    type: "ATTENDANCE",
                    status: "UNREAD",
                    target: "student",
                    createdAt: Timestamp.now(),
                    metadata: { date, status }
                });
            }
        }

        await batch.commit();

        return { success: true, stats };
    }

    /**
     * Records daily attendance for the teaching faculty.
     * 
     * Similar to student attendance, this enforces school hour windows and record immutability.
     * Automatically cross-references submitted IDs against the active teachers registry
     * and triggers system notifications for the concerned faculty members.
     * 
     * @param date - The target date in ISO YYYY-MM-DD format.
     * @param records - A dictionary mapping teacher school IDs to their status ('P' or 'A').
     * @param markedBy - The UID of the administrator submitting the attendance.
     * @returns A promise resolving to success status and faculty attendance stats.
     * @throws Error if submitted outside of configured active school hours.
     */
    static async markTeacherAttendance(date: string, records: Record<string, 'P' | 'A'>, markedBy: string) {
        // Enforce time window
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < SCHOOL_TIME_WINDOW.startHour || currentHour > SCHOOL_TIME_WINDOW.endHour) {
            throw new Error(`Business Rule Violation: Attendance can only be marked during school hours (${SCHOOL_TIME_WINDOW.startHour}:00 - ${SCHOOL_TIME_WINDOW.endHour}:00).`);
        }

        const attId = `TEACHERS_${date}`;
        const attRef = adminDb.collection("attendance_daily").doc(attId);

        const [existingSnap, teachersSnap] = await Promise.all([
            attRef.get(),
            adminDb.collection("teachers")
                .where("status", "==", "ACTIVE")
                .get()
        ]);

        if (existingSnap.exists) {
            throw new Error("Business Rule Violation: Attendance is read-only after being marked and cannot be updated dynamically.");
        }

        const validTeacherMap: Record<string, string> = {};
        teachersSnap.docs.forEach((doc: any) => {
            const data = doc.data();
            const sid = data.schoolId || doc.id;
            validTeacherMap[sid] = data.uid || "";
        });

        const validatedRecords: Record<string, 'P' | 'A'> = {};
        let presentCount = 0;
        let absentCount = 0;

        for (const [schoolId, status] of Object.entries(records)) {
            if (validTeacherMap[schoolId] !== undefined) {
                validatedRecords[schoolId] = status;
                if (status === 'P') presentCount++;
                if (status === 'A') absentCount++;
            }
        }

        const stats = { total: presentCount + absentCount, present: presentCount, absent: absentCount };

        const pureAttendanceData = {
            id: attId,
            date,
            type: "TEACHERS",
            markedBy,
            records: validatedRecords,
            stats,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            isModified: false
        };

        const batch = adminDb.batch();
        batch.set(attRef, pureAttendanceData);

        await AuditService.log({
            userId: markedBy,
            userRole: 'ADMIN',
            action: 'MARK_ATTENDANCE',
            entityId: attId,
            entityType: 'attendance',
            oldValue: null,
            newValue: pureAttendanceData
        }, batch);

        for (const [schoolId, status] of Object.entries(validatedRecords)) {
            const uid = validTeacherMap[schoolId];
            if (uid) {
                const notifRef = adminDb.collection("notifications").doc();
                batch.set(notifRef, {
                    userId: uid,
                    title: "Attendance Marked",
                    message: `Your attendance for ${date} has been marked as ${status === 'P' ? 'Present' : 'Absent'}.`,
                    type: "ATTENDANCE",
                    status: "UNREAD",
                    target: "teacher",
                    createdAt: Timestamp.now(),
                    metadata: { date, status }
                });
            }
        }

        await batch.commit();

        return { success: true, stats };
    }

    /**
     * Records daily attendance for non-teaching support staff.
     * 
     * Enforces the standard enterprise attendance rules (time windows, immutability,
     * and validation). Logs the action in the central audit trail and notifies
     * staff members via the integrated notification system.
     * 
     * @param date - The target date in ISO YYYY-MM-DD format.
     * @param records - A dictionary mapping staff school IDs to their status ('P' or 'A').
     * @param markedBy - The UID of the administrator submitting the attendance.
     * @returns A promise resolving to the final attendance statistics for the day.
     */
    static async markStaffAttendance(date: string, records: Record<string, 'P' | 'A'>, markedBy: string) {
        // Enforce time window
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < SCHOOL_TIME_WINDOW.startHour || currentHour > SCHOOL_TIME_WINDOW.endHour) {
            throw new Error(`Business Rule Violation: Attendance can only be marked during school hours (${SCHOOL_TIME_WINDOW.startHour}:00 - ${SCHOOL_TIME_WINDOW.endHour}:00).`);
        }

        const attId = `STAFF_${date}`;
        const attRef = adminDb.collection("attendance_daily").doc(attId);

        const [existingSnap, staffSnap] = await Promise.all([
            attRef.get(),
            adminDb.collection("staff").get()
        ]);

        if (existingSnap.exists) {
            throw new Error("Business Rule Violation: Attendance is read-only after being marked and cannot be updated dynamically.");
        }

        const validStaffMap: Record<string, string> = {};
        staffSnap.docs.forEach((doc: any) => {
            const data = doc.data();
            const sid = doc.id;
            validStaffMap[sid] = data.uid || "";
        });

        const validatedRecords: Record<string, 'P' | 'A'> = {};
        let presentCount = 0;
        let absentCount = 0;

        for (const [schoolId, status] of Object.entries(records)) {
            if (validStaffMap[schoolId] !== undefined) {
                validatedRecords[schoolId] = status;
                if (status === 'P') presentCount++;
                if (status === 'A') absentCount++;
            }
        }

        const stats = { total: presentCount + absentCount, present: presentCount, absent: absentCount };

        const pureAttendanceData = {
            id: attId,
            date,
            type: "STAFF",
            markedBy,
            records: validatedRecords,
            stats,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            isModified: false
        };

        const batch = adminDb.batch();
        batch.set(attRef, pureAttendanceData);

        await AuditService.log({
            userId: markedBy,
            userRole: 'ADMIN',
            action: 'MARK_ATTENDANCE',
            entityId: attId,
            entityType: 'attendance',
            oldValue: null,
            newValue: pureAttendanceData
        }, batch);

        for (const [schoolId, status] of Object.entries(validatedRecords)) {
            const uid = validStaffMap[schoolId];
            if (uid) {
                const notifRef = adminDb.collection("notifications").doc();
                batch.set(notifRef, {
                    userId: uid,
                    title: "Attendance Marked",
                    message: `Your attendance for ${date} has been marked as ${status === 'P' ? 'Present' : 'Absent'}.`,
                    type: "ATTENDANCE",
                    status: "UNREAD",
                    target: "staff",
                    createdAt: Timestamp.now(),
                    metadata: { date, status }
                });
            }
        }

        await batch.commit();

        return { success: true, stats };
    }
}

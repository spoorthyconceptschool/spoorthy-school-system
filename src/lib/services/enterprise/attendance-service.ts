import { adminDb, Timestamp } from "@/lib/firebase-admin";
import { AuditService } from "./audit-service";

/**
 * ENTERPRISE ATTENDANCE SERVICE
 * Strict 3-Layer Architecture | Backend Enforcement Only
 * 
 * Rules:
 * - One attendance record per student per day
 * - Read-only after marking
 * - School time window enforcement
 * - Unknown persons ignored
 * - No face images stored
 */

// Configuration for time window enforcement (24-hour format)
const SCHOOL_TIME_WINDOW = { startHour: 7, endHour: 17 };

export class EnterpriseAttendanceService {

    /**
     * Mark daily attendance for a class section.
     * @param date "YYYY-MM-DD"
     * @param classId The class ID
     * @param sectionId The section ID
     * @param records Map of studentId -> 'P' | 'A'
     * @param markedBy The user ID marking attendance
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
     * Mark daily attendance for Teachers.
     * @param date "YYYY-MM-DD"
     * @param records Map of schoolId -> 'P' | 'A'
     * @param markedBy The user ID marking attendance
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
     * Mark daily attendance for Staff.
     * @param date "YYYY-MM-DD"
     * @param records Map of schoolId -> 'P' | 'A'
     * @param markedBy The user ID marking attendance
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

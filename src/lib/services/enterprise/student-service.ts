import { adminDb, adminAuth, adminRtdb, FieldValue, ServerValue, Timestamp } from "@/lib/firebase-admin";
import { CreateStudentPayload, UpdateStudentPayload } from "@/lib/enterprise/schemas";
import { AuditService } from "./audit-service";
import { SearchService } from "./search-service";

/**
 * Enterprise Student Service
 * Strict 3-Layer Architecture | Backend Enforcement Only
 * 
 * Rules:
 * - Student edits must be versioned.
 * - Old data must remain accessible for audit.
 * - No destructive deletes for critical data.
 */
export class EnterpriseStudentService {

    /**
     * Creates a new student strictly conforming to the CreateStudentPayload schema.
     * Uses atomic batches and centralized audit logging.
     * 
     * @param payload Validated student payload
     * @param createdBy Admin user ID creating the student
     */
    static async createStudent(payload: CreateStudentPayload, createdBy: string) {
        try {
            const counterRef = adminDb.collection("counters").doc("students");
            let newSchoolId = payload.admissionNumber;

            const studentRecord = await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
                const counterDoc = await transaction.get(counterRef as FirebaseFirestore.DocumentReference);
                const nextIdNum = ((counterDoc.data() as any)?.current || 0) + 1;

                newSchoolId = `SHS${String(nextIdNum).padStart(5, "0")}`;

                const syntheticEmail = `${newSchoolId}@school.local`.toLowerCase();

                transaction.set(counterRef, { current: nextIdNum }, { merge: true });

                return {
                    newSchoolId,
                    syntheticEmail,
                    nextIdNum
                };
            });

            const userRecord = await adminAuth.createUser({
                email: studentRecord.syntheticEmail,
                password: payload.parentContact,
                displayName: `${payload.firstName} ${payload.lastName || ''}`.trim()
            });

            await adminAuth.setCustomUserClaims(userRecord.uid, { role: "STUDENT" });

            const studentName = `${payload.firstName} ${payload.lastName || ''}`.trim();

            const keywords = Array.from(new Set([
                ...SearchService.generateKeywords(studentName),
                ...SearchService.generateKeywords(studentRecord.newSchoolId),
                ...SearchService.generateKeywords(payload.parentContact || ""),
                ...SearchService.generateKeywords(payload.classId || "")
            ]));

            const finalStudentData = {
                ...payload,
                studentName,
                schoolId: studentRecord.newSchoolId,
                uid: userRecord.uid,
                role: "STUDENT",
                status: "ACTIVE",
                version: 1,
                keywords,
                createdAt: Timestamp.now(),
                admissionDate: new Date().toISOString()
            };

            const batch = adminDb.batch();

            const studentRef = adminDb.collection("students").doc(studentRecord.newSchoolId);
            batch.set(studentRef, finalStudentData);

            const historyRef = adminDb.collection(`students/${studentRecord.newSchoolId}/history`).doc(`v1`);
            batch.set(historyRef, {
                ...finalStudentData,
                snapshotTimestamp: Timestamp.now(),
                snapshotReason: 'INITIAL_CREATION',
                changedBy: createdBy
            });

            const userRef = adminDb.collection("users").doc(userRecord.uid);
            batch.set(userRef, {
                schoolId: studentRecord.newSchoolId,
                role: "STUDENT",
                status: "ACTIVE",
                email: studentRecord.syntheticEmail
            });

            const ledgerYear = payload.academicYear || "2026-2027";
            const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${studentRecord.newSchoolId}_${ledgerYear}`);
            batch.set(ledgerRef, {
                studentId: studentRecord.newSchoolId,
                studentName,
                yearId: ledgerYear,
                totalFee: 0,
                totalPaid: 0,
                status: 'PENDING',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            await AuditService.log({
                userId: createdBy,
                userRole: 'ADMIN',
                action: 'CREATE_STUDENT',
                entityId: studentRecord.newSchoolId,
                entityType: 'student',
                oldValue: null,
                newValue: finalStudentData
            }, batch);

            await SearchService.indexStudent(studentRecord.newSchoolId, finalStudentData, batch);

            await batch.commit();

            try {
                await adminRtdb.ref(`students/${studentRecord.newSchoolId}`).set({
                    ...finalStudentData,
                    createdAt: ServerValue ? ServerValue.TIMESTAMP : new Date().getTime(),
                });
            } catch (e) {
                console.warn("[EnterpriseStudentService] RTDB Sync missed on create:", e);
            }

            return { success: true, schoolId: studentRecord.newSchoolId, uid: userRecord.uid };
        } catch (error: any) {
            console.error("[EnterpriseStudentService] Core Failure:", error);
            // Wrap in a more detailed error for the UI
            throw new Error(`Critical Admission Step Failed: ${error.message} (TraceID: ${Date.now()})`);
        }
    }


    /**
     * Updates an existing student strictly conforming to the UpdateStudentPayload schema.
     * Enforces Optimistic Concurrency Control (Version checks) preventing silent overwrites.
     */
    static async updateStudent(studentId: string, payload: UpdateStudentPayload, updatedBy: string) {
        const studentRef = adminDb.collection("students").doc(studentId);

        return await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
            const studentDoc = await transaction.get(studentRef as FirebaseFirestore.DocumentReference);
            if (!(studentDoc as any).exists) {
                throw new Error("Student does not exist");
            }

            const currentData = (studentDoc as any).data() as any;
            const currentVersion = currentData.version || 1;

            if (payload.versionContentHash && payload.versionContentHash !== String(currentVersion)) {
                throw new Error(`Concurrency Violation: Version mismatch. Expected ${currentVersion}, got ${payload.versionContentHash}`);
            }

            const nextVersion = currentVersion + 1;
            const cleanPayload = { ...payload };
            delete cleanPayload.versionContentHash;

            const mergedData = { ...currentData, ...cleanPayload };
            const keywords = Array.from(new Set([
                ...SearchService.generateKeywords(mergedData.studentName || ""),
                ...SearchService.generateKeywords(studentId),
                ...SearchService.generateKeywords(mergedData.parentMobile || ""),
                ...SearchService.generateKeywords(mergedData.className || ""),
                ...SearchService.generateKeywords(mergedData.villageName || "")
            ]));

            const updatedData = {
                ...currentData,
                ...cleanPayload,
                version: nextVersion,
                keywords,
                updatedAt: Timestamp.now(),
            };

            // 1. Core update inside transaction block
            transaction.set(studentRef, updatedData, { merge: true });

            // 2. Snapshot (Append-only history log)
            const historyRef = adminDb.collection(`students/${studentId}/history`).doc(`v${nextVersion}`);
            transaction.set(historyRef, {
                ...updatedData,
                snapshotTimestamp: Timestamp.now(),
                snapshotReason: 'USER_UPDATE',
                changedBy: updatedBy
            });

            // 3. Centralized Audit Log
            AuditService.logTransaction({
                userId: updatedBy,
                userRole: 'ADMIN',
                action: 'UPDATE_STUDENT',
                entityId: studentId,
                entityType: 'student',
                oldValue: currentData,
                newValue: updatedData
            }, transaction);

            // 4. Update Search Index
            SearchService.indexStudent(studentId, updatedData, transaction as any);

            return { success: true, newVersion: nextVersion };
        });
    }
}

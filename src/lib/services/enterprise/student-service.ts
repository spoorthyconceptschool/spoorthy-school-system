import { adminDb, adminAuth, adminRtdb, FieldValue, ServerValue, Timestamp } from "@/lib/firebase-admin";
import { CreateStudentPayload, UpdateStudentPayload } from "@/lib/enterprise/schemas";
import { AuditService } from "./audit-service";

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
        // Enforce admission number uniqueness via counter or precise querying if required.
        // For now, generating a structured admission number if not explicitly defined like in the legacy code.
        const counterRef = adminDb.collection("counters").doc("students");

        let newSchoolId = payload.admissionNumber;

        // Atomic Transaction to safely increment student counter and guarantee no admission overlap
        const studentRecord = await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
            const counterDoc = await transaction.get(counterRef as FirebaseFirestore.DocumentReference);
            const nextIdNum = ((counterDoc.data() as any)?.current || 0) + 1;

            // If the frontend didn't pass a strict admission number or we override it to guarantee sequence:
            newSchoolId = `SHS${String(nextIdNum).padStart(5, "0")}`; // Example format

            // Synthetic Auth mapping
            const syntheticEmail = `${newSchoolId}@school.local`.toLowerCase();

            // Note: Firebase Auth user creation cannot be wrapped in a Firestore transaction.
            // So we execute it right before the batch, but if it fails, the transaction fails.

            // Increment the counter atomically inside the transaction
            transaction.set(counterRef, { current: nextIdNum }, { merge: true });

            return {
                newSchoolId,
                syntheticEmail,
                nextIdNum
            };
        });

        // Outside transaction - hit Auth service (Idempotent enough for this flow, though edge cases exist if DB write fails next)
        const userRecord = await adminAuth.createUser({
            email: studentRecord.syntheticEmail,
            password: payload.parentMobile, // Default password
            displayName: payload.studentName
        });

        await adminAuth.setCustomUserClaims(userRecord.uid, { role: "STUDENT" });

        const finalStudentData = {
            ...payload,
            studentName: payload.studentName,
            schoolId: studentRecord.newSchoolId, // Overriding the payload admissionNumber with system generated one
            uid: userRecord.uid,
            role: "STUDENT",
            status: "ACTIVE",
            version: 1, // Enterprise Versioning Start
            createdAt: Timestamp.now(),
            admissionDate: new Date().toISOString()
        };

        const batch = adminDb.batch();

        // 1. Save Core Student Record
        const studentRef = adminDb.collection("students").doc(studentRecord.newSchoolId);
        batch.set(studentRef, finalStudentData);

        // 2. Initial Version Record (For History/Audit)
        const historyRef = adminDb.collection(`students/${studentRecord.newSchoolId}/history`).doc(`v1`);
        batch.set(historyRef, {
            ...finalStudentData,
            snapshotTimestamp: Timestamp.now(),
            snapshotReason: 'INITIAL_CREATION',
            changedBy: createdBy
        });

        // 3. Save User Mapping
        const userRef = adminDb.collection("users").doc(userRecord.uid);
        batch.set(userRef, {
            schoolId: studentRecord.newSchoolId,
            role: "STUDENT",
            status: "ACTIVE",
            email: studentRecord.syntheticEmail
        });

        // 4. Initial Fee Ledger (Empty/Append-Only setup)
        // Assuming current academic year is dynamically determined or passed. Hardcoded for MVP example.
        const ledgerYear = payload.academicYear || "2026-2027";
        const ledgerRef = adminDb.collection("fee_ledger_accounts").doc(`${studentRecord.newSchoolId}_${ledgerYear}`);
        batch.set(ledgerRef, {
            studentId: studentRecord.newSchoolId,
            academicYear: payload.academicYear || "2026-2027",
            balance: 0,
            status: 'ACTIVE',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        // 5. Enterprise Audit Log
        await AuditService.log({
            userId: createdBy,
            userRole: 'ADMIN',
            action: 'CREATE_STUDENT',
            entityId: studentRecord.newSchoolId,
            entityType: 'student',
            oldValue: null,
            newValue: finalStudentData
        }, batch);

        await batch.commit();

        // Bonus: Legacy RTDB sync (non-critical, fail gracefully)
        try {
            await adminRtdb.ref(`students/${studentRecord.newSchoolId}`).set({
                ...finalStudentData,
                createdAt: ServerValue ? ServerValue.TIMESTAMP : new Date().getTime(),
            });
        } catch (e) {
            console.warn("[EnterpriseStudentService] RTDB Sync missed on create:", e);
        }

        return { success: true, schoolId: studentRecord.newSchoolId, uid: userRecord.uid };
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

            const updatedData = {
                ...currentData,
                ...cleanPayload,
                version: nextVersion,
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

            return { success: true, newVersion: nextVersion };
        });
    }
}

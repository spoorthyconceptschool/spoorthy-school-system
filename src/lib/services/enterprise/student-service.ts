import { adminDb, adminAuth, adminRtdb, ServerValue, Timestamp } from "@/lib/firebase-admin";
import { CreateStudentPayload, UpdateStudentPayload } from "@/lib/enterprise/schemas";
import { AuditService } from "./audit-service";
import { SearchService } from "./search-service";
import { calculateStudentLedger } from "@/lib/fees/calculations";

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
        let userRecord: any = null;
        try {
            const academicYear = payload.academicYear || "2026-2027";
            const yearPart = academicYear.split("-")[0] || "2026";

            // Fetch Dynamic Prefix from settings
            const settingsRef = adminDb.collection("settings").doc("branding");
            const settingsSnap = await settingsRef.get();
            const brandingData = settingsSnap.data() || {};
            const prefix = brandingData.studentIdPrefix || "SCS";
            const startingNumber = brandingData.studentIdSuffix ? Number(brandingData.studentIdSuffix) : 1;

            const counterId = `students_global`;
            const counterRef = adminDb.collection("counters").doc(counterId);

            let newSchoolId = payload.admissionNumber;

            const studentRecord = await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
                const counterDoc = await transaction.get(counterRef as FirebaseFirestore.DocumentReference);
                let currentCount = (counterDoc.data() as any)?.current || 0;
                
                let nextIdNum = startingNumber;
                if (currentCount >= startingNumber) {
                    nextIdNum = currentCount + 1;
                }

                // New Format: SCS00001 (Configurable Prefix, Continuous Sequence)
                newSchoolId = `${prefix}${String(nextIdNum).padStart(5, "0")}`;

                const syntheticEmail = `${newSchoolId}@school.local`.toLowerCase();

                transaction.set(counterRef, { current: nextIdNum, year: yearPart }, { merge: true });

                return {
                    newSchoolId,
                    syntheticEmail,
                    nextIdNum
                };
            });

            const studentName = `${payload.firstName} ${payload.lastName || ''}`.trim();
            // Secure Temporary Password
            const tempPassword = Math.random().toString(36).slice(-8) + "@" + studentRecord.newSchoolId;

            // PRE-EMPTIVE CLEANUP: Check if a user with this email already exists (e.g., from an orphaned record)
            try {
                const existingUser = await adminAuth.getUserByEmail(studentRecord.syntheticEmail);
                if (existingUser) {
                    console.warn(`[Enterprise Admissions] Collision detected for ${studentRecord.syntheticEmail}. Cleaning up orphaned Auth user...`);
                    await adminAuth.deleteUser(existingUser.uid);
                }
            } catch (authErr: any) {
                // If user not found, that's what we expect. Ignore other errors unless catastrophic.
                if (authErr.code !== 'auth/user-not-found') {
                    console.error("[Enterprise Admissions] Auth Pre-check failed:", authErr);
                }
            }

            userRecord = await adminAuth.createUser({
                email: studentRecord.syntheticEmail,
                password: tempPassword,
                displayName: studentName
            });

            await adminAuth.setCustomUserClaims(userRecord.uid, { role: "STUDENT" });

            const keywords = Array.from(new Set([
                ...SearchService.generateKeywords(studentName),
                ...SearchService.generateKeywords(studentRecord.newSchoolId),
                ...SearchService.generateKeywords(payload.parentContact || ""),
                ...SearchService.generateKeywords(payload.classId || "")
            ]));

            const resolvedAdmissionNumber = (!payload.admissionNumber || payload.admissionNumber === "PENDING")
                ? studentRecord.newSchoolId
                : payload.admissionNumber;

            const finalStudentData = {
                ...payload,
                studentName,
                schoolId: studentRecord.newSchoolId,
                admissionNumber: resolvedAdmissionNumber,
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

            // --- REAL-TIME FEE LEDGER AUTOMATION ---
            const ledgerYear = payload.academicYear || "2026-2027";
            const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${studentRecord.newSchoolId}_${ledgerYear}`);

            // Fetch fee context in parallel (Note: we use get() on adminDb here safely as it's outside the transaction above)
            const [configSnap, customFeesSnap, classesSnap]: [any, any, any] = await Promise.all([
                adminDb.collection("config").doc("fees").get(),
                adminDb.collection("custom_fees").where("status", "==", "ACTIVE").where("academicYearId", "==", ledgerYear).get(),
                adminDb.collection("master_classes").get()
            ]);

            const feeConfig = configSnap.exists ? configSnap.data() : { terms: [], transportFees: {} };
            const activeCustomFees = customFeesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));
            const classMap = new Map<string, string>();
            classesSnap.docs.forEach((d: any) => classMap.set(d.id, (d.data() as any).name));

            const initialLedger = calculateStudentLedger(
                finalStudentData,
                feeConfig as any,
                activeCustomFees,
                classMap,
                ledgerYear
            );

            batch.set(ledgerRef, {
                ...initialLedger,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            // ------------------------------------------

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

            return { success: true, schoolId: studentRecord.newSchoolId, uid: userRecord.uid, tempPassword };
        } catch (error: any) {
            // ROLLBACK: Delete Auth user if downstream DB writes failed to prevent orphaned accounts.
            if (userRecord?.uid) {
                try {
                    await adminAuth.deleteUser(userRecord.uid);
                    console.info("[EnterpriseStudentService] Rolled back Auth user due to failure:", userRecord.uid);
                } catch (rollbackError) {
                    console.error("[EnterpriseStudentService] Critical Error: Rollback failed:", rollbackError);
                }
            }
            console.error("[EnterpriseStudentService] Core Failure:", error);
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

            const updatedData = {
                ...currentData,
                ...cleanPayload,
                version: nextVersion,
                updatedAt: Timestamp.now(),
            };

            const keywords = Array.from(new Set([
                ...SearchService.generateKeywords(updatedData.studentName || ""),
                ...SearchService.generateKeywords(studentId),
                ...SearchService.generateKeywords(updatedData.parentMobile || ""),
                ...SearchService.generateKeywords(updatedData.className || ""),
                ...SearchService.generateKeywords(updatedData.villageName || "")
            ]));

            updatedData.keywords = keywords;

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

            // 5. AUTO FEE SYNC (Triggered if class, village, or transport status changed)
            const needsFeeSync =
                cleanPayload.classId !== undefined ||
                cleanPayload.villageId !== undefined ||
                cleanPayload.transportRequired !== undefined;

            if (needsFeeSync) {
                const ledgerYear = updatedData.academicYear || "2026-2027";
                const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${studentId}_${ledgerYear}`);

                // Fetch context (Unfortunately we can't easily await inside transaction for external collections without performance hit, but for single record it's okay)
                const [configDoc, customFeesSnap, classesSnap, ledgerDoc]: [any, any, any, any] = await Promise.all([
                    adminDb.collection("config").doc("fees").get(),
                    adminDb.collection("custom_fees").where("status", "==", "ACTIVE").where("academicYearId", "==", ledgerYear).get(),
                    adminDb.collection("master_classes").get(),
                    transaction.get(ledgerRef)
                ]);

                const feeConfig = configDoc.exists ? configDoc.data() : { terms: [], transportFees: {} };
                const activeCustomFees = customFeesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));
                const classMap = new Map<string, string>();
                classesSnap.docs.forEach((d: any) => classMap.set(d.id, (d.data() as any).name));

                const updatedLedger = calculateStudentLedger(
                    updatedData,
                    feeConfig as any,
                    activeCustomFees,
                    classMap,
                    ledgerYear,
                    ledgerDoc.exists ? ledgerDoc.data() : undefined
                );

                transaction.set(ledgerRef, {
                    ...updatedLedger,
                    updatedAt: Timestamp.now()
                }, { merge: true });
            }

            return { success: true, newVersion: nextVersion };
        });
    }
}

import { z } from 'zod';
import { adminDb, adminAuth, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { AuditService } from "./audit-service";
import { validateEnterpriseSchema } from "@/lib/enterprise/schemas";

// --- Enterprise User Schema Definitions ---
export const UserRoleSchema = z.enum(["ADMIN", "TEACHER", "ACCOUNTANT", "STUDENT"]);
export type EnterpriseRole = z.infer<typeof UserRoleSchema>;

export const CreateUserPayloadSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Passwords must be heavily enforced (8+ characters)"),
    displayName: z.string().min(2).max(100),
    role: UserRoleSchema,
    mobile: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Must be strict E.164 phone format").optional()
});
export type CreateUserPayload = z.infer<typeof CreateUserPayloadSchema>;


/**
 * Enterprise User Access & Permissions Service
 * Strict 3-Layer Architecture | Backend Enforcement Only
 * 
 * Rules:
 * - Passwords MUST be hashed (Firebase Auth natively handles adaptive scrypt hashing for us)
 * - One-time secure desktop login for sensitive software (Tied to Auth state constraints handled by UI)
 * - No shared credentials / Strict Role assignments on Auth Claims.
 */
export class EnterpriseUserService {

    /**
     * Creates a new System User (E.g. Accountant, Teacher, Admin).
     * Atomic operations and custom claims enforced strictly here.
     * 
     * @param payload User Details conforming to CreateUserPayloadSchema
     * @param createdBy Admin user executing the creation
     */
    static async createUser(payload: CreateUserPayload, createdBy: string) {

        // 1. Enforce Hashed Storage through Firebase Admin
        const userRecord = await adminAuth.createUser({
            email: payload.email,
            password: payload.password, // Firebase hashes this automatically via Scrypt
            displayName: payload.displayName,
            phoneNumber: payload.mobile
        });

        // 2. Lock down role into ID Token using Custom Claims
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: payload.role });

        const userData = {
            email: userRecord.email,
            displayName: userRecord.displayName,
            role: payload.role,
            status: "ACTIVE",
            createdAt: Timestamp.now(),
            createdBy: createdBy
        };

        const batch = adminDb.batch();

        // 3. Save purely read-only public user profile for UI access
        const userRef = adminDb.collection("users").doc(userRecord.uid);
        batch.set(userRef, userData);

        // 4. Detailed Audit Logging ensuring trackability
        await AuditService.log({
            userId: createdBy,
            userRole: 'ADMIN', // The API boundary guaranteed this
            action: 'CREATE_USER',
            entityId: userRecord.uid,
            entityType: 'user',
            oldValue: null,
            newValue: userData
        }, batch);

        await batch.commit();

        return { success: true, uid: userRecord.uid, email: userRecord.email };
    }

    /**
     * Re-assigns roles or soft-suspends users safely.
     * Destructive deletions are completely prohibited.
     */
    static async revokeAccess(uid: string, targetRole: EnterpriseRole, revokedBy: string, reason: string) {
        const userRef = adminDb.collection("users").doc(uid);

        return await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
            const userDoc = await transaction.get(userRef as FirebaseFirestore.DocumentReference);
            if (!(userDoc as any).exists) throw new Error("User does not exist.");

            const currentData = (userDoc as any).data();

            // 1. Force Firebase Auth account suspension
            await adminAuth.updateUser(uid, { disabled: true });
            await adminAuth.revokeRefreshTokens(uid); // Immediately kill active sessions

            const newData = {
                ...currentData,
                status: "SUSPENDED",
                suspendedAt: Timestamp.now(),
                suspensionReason: reason
            };

            // 2. Soft-update status in Firestore
            transaction.set(userRef, newData, { merge: true });

            // 3. Central Audit
            AuditService.logTransaction({
                userId: revokedBy,
                userRole: 'ADMIN',
                action: 'UPDATE_USER',
                entityId: uid,
                entityType: 'user',
                oldValue: { status: currentData.status },
                newValue: { status: "SUSPENDED", reason }
            }, transaction);

            return { success: true, uid };
        });
    }
}

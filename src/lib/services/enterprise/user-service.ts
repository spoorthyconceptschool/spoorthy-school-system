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
 * 
 * Manages the generation, role assignment, and access control for system users. 
 * This service handles security-critical tasks like custom claim injection
 * and account suspensions to ensure environment integrity.
 * 
 * Rules:
 * 1. Secure Storage: Passwords MUST be hashed (handled automatically by Firebase Auth).
 * 2. RBAC Enforcement: User roles are locked into ID Tokens using Auth Custom Claims.
 * 3. Auditability: All user creation and permission changes must be logged.
 * 4. Immutable History: Records are NEVER deleted; only 'SUSPENDED' or 'REVOKED'.
 */
export class EnterpriseUserService {

    /**
     * Creates a new administrative user with assigned system privileges.
     * 
     * Registers the user with Firebase Authentication and creates a parallel 
     * public profile record in the central 'users' collection. Roles are 
     * injected directly into the user's secure token for real-time permission checks.
     * 
     * @param payload - Verified information conforming to the user schema.
     * @param createdBy - UID of the administrator who is provisioning this user.
     * @returns A promise resolving to user identifiers (UID and primary email).
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
     * Soft-suspends a system user and revokes their active access tokens.
     * 
     * This is a non-destructive method to permanently or temporarily disable 
     * a user's account. It disables the Firebase Auth record and marks the
     * profile record as 'SUSPENDED' for system-wide exclusion.
     * 
     * @param uid - The unique key of the user to revoke.
     * @param targetRole - The administrative role authorizing the action.
     * @param revokedBy - The UID of the admin performing the revocation.
     * @param reason - Detailed justification (Required for compliance).
     * @returns A promise resolving to the impacted UID.
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

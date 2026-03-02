import { adminDb, FieldValue } from "@/lib/firebase-admin";

/**
 * Valid sensitive actions that are tracked within the school system.
 * These actions are logged with full state snapshots for audit and compliance.
 */
export type AuditActionType =
    | 'CREATE_STUDENT'
    | 'UPDATE_STUDENT'
    | 'DELETE_STUDENT'
    | 'MARK_ATTENDANCE'
    | 'UPDATE_ATTENDANCE'
    | 'POST_FEE'
    | 'REVERSE_FEE'
    | 'UPDATE_FEE_STRUCTURE'
    | 'CREATE_USER'
    | 'UPDATE_USER'
    | 'DELETE_USER'
    | 'SYSTEM_CONFIG_CHANGE';

/**
 * Represents a single normalized entry within the system audit logs.
 */
export interface AuditLogEntry {
    /** Uid of the actor who performed the action. */
    userId: string;
    /** Role/Rank of the actor at the time of action. */
    userRole: string;
    /** The specific action constant. */
    action: AuditActionType;
    /** Primary unique key of the modified database record. */
    entityId: string;
    /** The logical collection group. */
    entityType: 'student' | 'attendance' | 'fee_ledger' | 'user' | 'system';
    /** JSON payload of the record BEFORE modification. */
    oldValue: Record<string, any> | null;
    /** JSON payload of the record AFTER modification. */
    newValue: Record<string, any> | null;
    /** Optional identifier for the origin network address. */
    ipAddress?: string;
    /** Extensible metadata for action-specific details. */
    metadata?: Record<string, any>;
}

/**
 * Enterprise Audit Service
 * Strictly enforces that all sensitive actions are logged with before/after state.
 * Audit logs are tamper-proof and append-only.
 */
export class AuditService {
    private static readonly COLLECTION = "audit_logs";

    /**
     * Logs a tamper-proof action to the audit trail.
     * This should be executed during the mutation process.
     * 
     * @param entry Data to log.
     * @param batch Optional Firestore write batch for atomicity.
     */
    static async log(entry: AuditLogEntry, batch?: FirebaseFirestore.WriteBatch): Promise<void> {
        const docRef = adminDb.collection(this.COLLECTION).doc();

        const payload = {
            ...entry,
            timestamp: FieldValue.serverTimestamp(),
            archived: false // Tagged for yearly auto-archiving
        };

        if (batch) {
            batch.set(docRef, payload);
        } else {
            await docRef.set(payload);
        }
    }

    /**
     * Utility for transactions. Ensure atomic writes along with data mutation.
     * 
     * @param entry Data to log.
     * @param transaction The active Firestore transaction.
     */
    static logTransaction(
        entry: AuditLogEntry,
        transaction: FirebaseFirestore.Transaction
    ): void {
        const docRef = adminDb.collection(this.COLLECTION).doc();
        const payload = {
            ...entry,
            timestamp: FieldValue.serverTimestamp(),
            archived: false
        };
        transaction.set(docRef, payload);
    }
}

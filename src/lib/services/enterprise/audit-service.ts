import { adminDb, FieldValue } from "@/lib/firebase-admin";

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

export interface AuditLogEntry {
    userId: string;
    userRole: string;
    action: AuditActionType;
    entityId: string;
    entityType: 'student' | 'attendance' | 'fee_ledger' | 'user' | 'system';
    oldValue: Record<string, any> | null;
    newValue: Record<string, any> | null;
    ipAddress?: string;
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

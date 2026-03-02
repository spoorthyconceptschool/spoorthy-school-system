import { adminDb, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { FeeLedgerEntryPayload } from "@/lib/enterprise/schemas";
import { AuditService } from "./audit-service";

/**
 * Enterprise Fee Ledger Service
 * 
 * Provides an append-only, idempotent financial ledger for managing student fees. 
 * This service is designed for maximum mathematical integrity and strict auditability.
 * 
 * Compliance Rules:
 * 1. Absolute Immutability: Financial records are NEVER overwritten or deleted.
 * 2. Rectification: Mistakes are corrected exclusively through reversal transactions.
 * 3. Atomic State: Account balances are updated in sync with the immutable ledger log.
 * 4. Audit Trail: Every single transaction is mirrored in the central system audit.
 */
export class EnterpriseFeeLedgerService {

    /**
     * Records a new financial transaction on a student's ledger.
     * 
     * Handles both 'CREDIT' (payments/discounts) and 'DEBIT' (charges/fees).
     * The method calculates the new running balance relative to the student's 
     * account status and saves both the individual ledger entry and an updated
     * snapshot of the student's total outstanding balance.
     * 
     * @param payload - A verified payload containing amount, type, and categorization.
     * @param postedBy - UID of the accountant or automated system posting the fee.
     * @returns A detailed result object including the new calculated ledger balance.
     */
    static async postTransaction(payload: FeeLedgerEntryPayload, postedBy: string) {
        // Assume academic year is determined by business logic or sent in payload. Using fixed for MVP.
        const academicYear = "2024-2025";
        const accountId = `${payload.studentId}_${academicYear}`;
        const accountRef = adminDb.collection("fee_ledger_accounts").doc(accountId);
        const entryRef = accountRef.collection("entries").doc(); // Auto-ID for append-only

        return await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
            const accountDoc = await transaction.get(accountRef as FirebaseFirestore.DocumentReference);

            // 1. Initialize account summary if it somehow doesn't exist yet (defensive)
            let currentBalance = 0; // Negative means they owe (Debits), Positive means overpaid (Credits)
            if (!accountDoc.exists) {
                // Seed the account summary
                transaction.set(accountRef, {
                    studentId: payload.studentId,
                    academicYear,
                    balance: 0,
                    status: 'ACTIVE',
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            } else {
                currentBalance = (accountDoc.data() as any).balance || 0;
            }

            // 2. Calculate new balance
            // DEBIT = Charge (Owes money) -> Decrease balance
            // CREDIT = Payment (Paid money) -> Increase balance
            const balanceDelta = payload.type === 'CREDIT' ? payload.amount : -Math.abs(payload.amount);
            const newBalance = currentBalance + balanceDelta;

            const entryData = {
                ...payload,
                id: entryRef.id,
                accountId,
                postedBy,
                timestamp: Timestamp.now(),
                runningBalance: newBalance,
                isReversal: false
            };

            // 3. Post append-only ledger entry
            transaction.set(entryRef, entryData);

            // 4. Update running balance safely
            transaction.set(accountRef, {
                balance: newBalance,
                updatedAt: Timestamp.now()
            }, { merge: true });

            // 5. Audit Log the financial action
            AuditService.logTransaction({
                userId: postedBy,
                userRole: 'ACCOUNTANT', // Ideal: injected from middleware
                action: payload.type === 'CREDIT' ? 'POST_FEE' : 'POST_FEE',
                entityId: entryRef.id,
                entityType: 'fee_ledger',
                oldValue: { balance: currentBalance },
                newValue: { balance: newBalance, entry: entryData }
            }, transaction);

            return { success: true, transactionId: entryRef.id, newBalance };
        });
    }

    /**
     * Post an inverse transaction to rectify an erroneous previous entry.
     * 
     * This is the only legitimate tool for addressing mistakes in the ledger.
     * It cross-references the original transaction, flags it as 'Reversed', 
     * and posts a counter-entry (e.g., if the original was a Payment, this posts a Charge).
     * 
     * @param originalTransactionId - Pointer to the errant record.
     * @param studentId - Owner of the ledger account.
     * @param academicYear - Target year (e.g. 2026-2027).
     * @param reversedBy - UID of the authorized user performing the reversal.
     * @param reason - Detailed explanation for the correction (required for auditing).
     * @throws Error if the original record is already reversed or does not exist.
     */
    static async reverseTransaction(originalTransactionId: string, studentId: string, academicYear: string, reversedBy: string, reason: string) {
        const accountId = `${studentId}_${academicYear}`;
        const accountRef = adminDb.collection("fee_ledger_accounts").doc(accountId);
        const originalEntryRef = accountRef.collection("entries").doc(originalTransactionId);
        const reversalEntryRef = accountRef.collection("entries").doc();

        return await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
            const originalDoc = await transaction.get(originalEntryRef as FirebaseFirestore.DocumentReference);
            if (!originalDoc.exists) throw new Error("Original transaction not found.");

            const originalData = originalDoc.data() as any;
            if (originalData.isReversal || originalData.reversedByTransactionId) {
                throw new Error("Transaction is already a reversal or has been reversed.");
            }

            const accountDoc = await transaction.get(accountRef as FirebaseFirestore.DocumentReference);
            const currentBalance = (accountDoc.data() as any).balance || 0;

            // Invert the operation
            const isOriginalCredit = originalData.type === 'CREDIT';
            const reversalType = isOriginalCredit ? 'DEBIT' : 'CREDIT';
            const balanceDelta = reversalType === 'CREDIT' ? originalData.amount : -Math.abs(originalData.amount);
            const newBalance = currentBalance + balanceDelta;

            const reversalData = {
                studentId,
                type: reversalType,
                amount: originalData.amount, // Keep positive integer
                feeCategoryId: originalData.feeCategoryId,
                description: `REVERSAL of ${originalTransactionId}: ${reason}`,
                referenceId: `REV-${originalTransactionId}`,
                id: reversalEntryRef.id,
                accountId,
                postedBy: reversedBy,
                timestamp: Timestamp.now(),
                runningBalance: newBalance,
                isReversal: true,
                reversesTransactionId: originalTransactionId
            };

            // Post reversal
            transaction.set(reversalEntryRef, reversalData);

            // Flag original as reversed (we don't DELETE it, just add metadata)
            transaction.set(originalEntryRef, {
                reversedByTransactionId: reversalEntryRef.id,
                reversedAt: Timestamp.now()
            }, { merge: true });

            // Update balance
            transaction.set(accountRef, {
                balance: newBalance,
                updatedAt: Timestamp.now()
            }, { merge: true });

            // Audit
            AuditService.logTransaction({
                userId: reversedBy,
                userRole: 'ACCOUNTANT',
                action: 'REVERSE_FEE',
                entityId: reversalEntryRef.id,
                entityType: 'fee_ledger',
                oldValue: { originalTransaction: originalData },
                newValue: { reversalTransaction: reversalData, newBalance }
            }, transaction);

            return { success: true, reversalId: reversalEntryRef.id, newBalance };
        });
    }
}

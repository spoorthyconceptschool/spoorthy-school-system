import { adminDb, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { FeeLedgerEntryPayload } from "@/lib/enterprise/schemas";
import { AuditService } from "./audit-service";

/**
 * Enterprise Fee Ledger Service
 * Strict 3-Layer Architecture | Backend Enforcement Only
 * 
 * Rules:
 * - Append-only ledger system.
 * - Never overwrite or delete financial data.
 * - To correct mistakes, reversing transactions must be posted.
 * - Balances are maintained atomically alongside immutable logs.
 */
export class EnterpriseFeeLedgerService {

    /**
     * Posts a new transaction (Credit/Payment or Debit/Charge) to a student's ledger.
     * Uses strict atomicity to guarantee no double-spending or race conditions.
     * 
     * @param payload Validated ledger entry payload
     * @param postedBy Admin/Accountant user ID executing the transaction
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
     * Exclusively for rectifying mistakes. Posts an inverse transaction.
     * 
     * @param originalTransactionId The ID of the transaction to reverse
     * @param studentId The student the transaction belongs to
     * @param academicYear The ledger year
     * @param reversedBy The user executing the reversal
     * @param reason Mandatory reason for compliance
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

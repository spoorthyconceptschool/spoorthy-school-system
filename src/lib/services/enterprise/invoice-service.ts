import { adminDb } from "@/lib/firebase-admin";

/**
 * Represents an individual debit or credit within a student's invoice.
 */
export interface InvoiceLineItem {
    id: string;
    /** Date of the transaction in ISO format. */
    date: string;
    description: string;
    /** Absolute monetary value (always positive integers/decimals). */
    amount: number;
    /** 
     * CREDIT indicates a payment/reduction.
     * DEBIT indicates a charge/addition.
     */
    type: 'CREDIT' | 'DEBIT';
}

/**
 * Represents a summarized financial snapshot for a student's academic year.
 * Invoices are read-only and pre-computed here.
 */
export interface EnterpriseInvoice {
    studentId: string;
    academicYear: string;
    /** The official generation timestamp. */
    generationDate: string;
    /** Total charges (debits) recorded. */
    totalCharges: number;
    /** Total payments (credits) recorded. */
    totalPaid: number;
    /** Mathematically enforced balance (Charges - Paid). */
    outstandingBalance: number;
    /** Collection of individual verified ledger entries. */
    lineItems: InvoiceLineItem[];
    /** The calculated settlement status. */
    status: 'PAID' | 'PARTIAL' | 'DUE';
}

/**
 * Enterprise Invoice Service
 * Strict 3-Layer Architecture | Backend Enforcement Only
 * 
 * Rules:
 * - Generate invoices strictly from immutable Ledger data.
 * - ZERO manual calculations in the User Interface.
 * - Everything must be pre-computed here.
 */
export class EnterpriseInvoiceService {

    /**
     * Synthesizes a real-time invoice for a student by aggregating their immutable ledger entries.
     * 
     * This method rebuilds the financial history of a student strictly from primary,
     * append-only entries, ensuring that calculations are reproducible, consistent,
     * and free from UI-layer artifacts.
     * 
     * @param studentId - The unique ID of the student.
     * @param academicYear - Target year for the summary.
     * @returns A pre-calculated student invoice for display or export.
     */
    static async generateInvoice(studentId: string, academicYear: string): Promise<EnterpriseInvoice> {
        const accountId = `${studentId}_${academicYear}`;
        const entriesRef = adminDb.collection("fee_ledger_accounts").doc(accountId).collection("entries");

        // Fetch ordered entries to rebuild the ledger strictly from primary sources
        const entriesSnap = await entriesRef.orderBy("timestamp", "asc").get();

        let totalCharges = 0; // Debits
        let totalPaid = 0;    // Credits
        const lineItems: InvoiceLineItem[] = [];

        entriesSnap.forEach((doc: any) => {
            const data = doc.data() as any;

            // Skip transactions that have been explicitly flagged as reversed
            if (data.reversedByTransactionId) {
                return;
            }

            if (data.type === 'DEBIT') {
                totalCharges += data.amount;
            } else if (data.type === 'CREDIT') {
                totalPaid += data.amount;
            }

            lineItems.push({
                id: doc.id,
                date: (data.timestamp?.toDate() || new Date()).toISOString(),
                description: data.description || "System Transaction",
                amount: data.amount,
                type: data.type
            });
        });

        // The exact outstanding balance is explicitly Total Charges - Total Paid
        const outstandingBalance = totalCharges - totalPaid;

        let status: EnterpriseInvoice['status'] = 'DUE';
        if (outstandingBalance <= 0) {
            status = 'PAID';
        } else if (totalPaid > 0) {
            status = 'PARTIAL';
        }

        return {
            studentId,
            academicYear,
            generationDate: new Date().toISOString(),
            totalCharges,
            totalPaid,
            outstandingBalance,
            lineItems,
            status
        };
    }
}

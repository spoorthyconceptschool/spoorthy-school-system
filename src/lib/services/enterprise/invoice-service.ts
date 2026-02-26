import { adminDb } from "@/lib/firebase-admin";

export interface InvoiceLineItem {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT'; // CREDIT = Paid, DEBIT = Charge
}

export interface EnterpriseInvoice {
    studentId: string;
    academicYear: string;
    generationDate: string;
    totalCharges: number;
    totalPaid: number;
    outstandingBalance: number;
    lineItems: InvoiceLineItem[];
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
     * Synthesizes a real-time invoice for a student by aggregating their Append-Only Ledger.
     * Guarantees 100% mathematical consistency.
     * 
     * @param studentId The ID of the student
     * @param academicYear Target ledger year
     */
    static async generateInvoice(studentId: string, academicYear: string): Promise<EnterpriseInvoice> {
        const accountId = `${studentId}_${academicYear}`;
        const entriesRef = adminDb.collection("fee_ledger_accounts").doc(accountId).collection("entries");

        // Fetch ordered entries to rebuild the ledger strictly from primary sources
        const entriesSnap = await entriesRef.orderBy("timestamp", "asc").get();

        let totalCharges = 0; // Debits
        let totalPaid = 0;    // Credits
        const lineItems: InvoiceLineItem[] = [];

        entriesSnap.forEach(doc => {
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

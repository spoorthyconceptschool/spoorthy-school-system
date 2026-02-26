import { NextRequest, NextResponse } from "next/server";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";
import { validateEnterpriseSchema, FeeLedgerEntrySchema } from "@/lib/enterprise/schemas";
import { EnterpriseFeeLedgerService } from "@/lib/services/enterprise/fee-ledger-service";

/**
 * ENTERPRISE APPEND-ONLY FEE LEDGER API
 * 
 * Strict Enforcement:
 * - Only ADMIN or ACCOUNTANT roles can post transactions.
 * - Payload must strictly conform to FeeLedgerEntrySchema.
 * - Transactions are append-only. No overwrites allowed.
 */
export async function POST(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN', 'ACCOUNTANT'], async (req, user) => {
        try {
            const body = await req.json();

            // 1. Strict Validation
            const { success, data, errors } = validateEnterpriseSchema(FeeLedgerEntrySchema, body);

            if (!success || !data) {
                return NextResponse.json({
                    error: "Validation Failed: Malformed Ledger Entry",
                    details: errors
                }, { status: 400 });
            }

            // 2. Execute Atomic Ledger Post
            const result = await EnterpriseFeeLedgerService.postTransaction(data, user.uid);

            return NextResponse.json({
                success: true,
                message: data.type === 'CREDIT' ? 'Payment securely recorded' : 'Charge securely recorded',
                data: {
                    transactionId: result.transactionId,
                    runningBalance: result.newBalance
                }
            });

        } catch (error: any) {
            console.error("[Enterprise Fee Ledger] Failed to post transaction:", error);
            return NextResponse.json({
                success: false,
                error: `Finance Operation Failed: ${error.message}`
            }, { status: 500 });
        }
    });
}

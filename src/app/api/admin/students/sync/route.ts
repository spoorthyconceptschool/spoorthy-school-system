import { NextRequest, NextResponse } from "next/server";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { syncStudentLedger } from "@/lib/services/fee-service";

/**
 * ENTERPRISE FEED LEDGER SYNC API
 * Forces a synchronization of a specific student's ledger with current global fee configuration.
 */
export async function POST(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN', 'MANAGER'], async (req, user) => {
        try {
            const body = await req.json();
            const { studentId, academicYear } = body;

            if (!studentId || !academicYear) {
                return NextResponse.json({ success: false, error: "studentId and academicYear are required" }, { status: 400 });
            }

            // 1. Fetch student for context
            const studentSnap = await adminDb.collection("students").doc(studentId).get();
            if (!studentSnap.exists) {
                return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
            }

            // 2. Execute Sync
            const result = await syncStudentLedger(adminDb as any, studentId, academicYear);

            return NextResponse.json({
                success: true,
                message: "Fee ledger synchronized successfully."
            });

        } catch (error: any) {
            console.error("[Enterprise Sync] Failure:", error);
            return NextResponse.json({
                success: false,
                error: `Sync Failed: ${error.message}`
            }, { status: 500 });
        }
    });
}

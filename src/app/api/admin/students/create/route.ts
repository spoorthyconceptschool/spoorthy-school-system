import { NextRequest, NextResponse } from "next/server";
import { getInitError } from "@/lib/firebase-admin";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";
import { CreateStudentSchema, validateEnterpriseSchema } from "@/lib/enterprise/schemas";
import { EnterpriseStudentService } from "@/lib/services/enterprise/student-service";

/**
 * ENTERPRISE ADMISSIONS API
 * Uses Enterprise Auth Middleware to strictly allow only Admins.
 * Uses Zod Schema to strictly validate payload.
 * Defers to EnterpriseStudentService for atomic creation, audit logging, and versioning.
 */

export async function GET() {
    try {
        const initErr = getInitError();
        if (initErr) {
            return NextResponse.json({
                status: "CRITICAL",
                message: "Initialization Failed",
                error: initErr
            }, { status: 500 });
        }
        return NextResponse.json({
            status: "ONLINE",
            message: "Enterprise Student Engine is VERIFIED."
        });
    } catch (e: any) {
        return NextResponse.json({
            status: "ERROR",
            message: `Shared Engine Failure: ${e.message}`
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // 1. Authorization: Only Admins and Managers can invoke this endpoint
    return withEnterpriseGuard(req, ['ADMIN', 'MANAGER'], async (req, user) => {
        try {
            const body = await req.json();

            // 2. Strict Zod Validation mapping frontend directly
            const { success, data, errors } = validateEnterpriseSchema(CreateStudentSchema, body);

            if (!success || !data) {
                return NextResponse.json({ error: "Validation Failed", details: errors }, { status: 400 });
            }

            // 3. Execution via strict Enterprise Service (Atomics, DB versioning, Auditing)
            const result = await EnterpriseStudentService.createStudent(data, user.uid);

            return NextResponse.json({
                success: true,
                data: { schoolId: result.schoolId, uid: result.uid }
            });

        } catch (error: any) {
            console.error("[Enterprise Admission] Core Failure:", error);
            return NextResponse.json({
                success: false,
                error: `Admission Failed: ${error.message}`
            }, { status: 500 });
        }
    });
}

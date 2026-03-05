import { NextRequest, NextResponse } from "next/server";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";
import { UpdateStudentSchema, validateEnterpriseSchema } from "@/lib/enterprise/schemas";
import { EnterpriseStudentService } from "@/lib/services/enterprise/student-service";

/**
 * ENTERPRISE STUDENT UPDATE API
 * Strictly enforces versioning and automated fee synchronization.
 */
export async function POST(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN'], async (req, user) => {
        try {
            const body = await req.json();
            const { studentId, ...payload } = body;

            if (!studentId) {
                return NextResponse.json({ success: false, error: "studentId is required" }, { status: 400 });
            }

            // 1. Validation
            const { success, data, errors } = validateEnterpriseSchema(UpdateStudentSchema, payload);

            if (!success || !data) {
                return NextResponse.json({
                    success: false,
                    error: "Validation Failed",
                    details: errors
                }, { status: 400 });
            }

            // 2. Execution via Enterprise Service (handles automated fee sync)
            const result = await EnterpriseStudentService.updateStudent(studentId, data, user.uid);

            return NextResponse.json({
                success: true,
                newVersion: result.newVersion
            });

        } catch (error: any) {
            console.error("[Enterprise Update] Failure:", error);
            return NextResponse.json({
                success: false,
                error: `Update Failed: ${error.message}`
            }, { status: 500 });
        }
    });
}

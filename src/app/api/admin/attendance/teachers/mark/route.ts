import { NextRequest, NextResponse } from "next/server";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";
import { EnterpriseAttendanceService } from "@/lib/services/enterprise/attendance-service";

/**
 * Enterprise Teacher Attendance Modification Rules:
 * - Handled by backend only.
 * - Time window bounds strictly applied inside EnterpriseAttendanceService.
 * - Modifications locked.
 */
export async function POST(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN'], async (req, user) => {
        try {
            const body = await req.json();
            const { date, records } = body;

            if (!date || !records) {
                return NextResponse.json({ success: false, error: "Validation Failed: Missing required fields" }, { status: 400 });
            }

            // Route all logic to our enterprise service
            const result = await EnterpriseAttendanceService.markTeacherAttendance(
                date,
                records,
                user.uid
            );

            return NextResponse.json({
                success: true,
                message: "Attendance securely locked and recorded.",
                data: result.stats
            });

        } catch (error: any) {
            console.error("[Enterprise Attendance] Failed to mark teacher attendance:", error);

            // Normalize error messages explicitly for Business Rule Violations
            const isBizVio = error.message?.includes("Business Rule Violation");

            return NextResponse.json({
                success: false,
                error: isBizVio ? error.message : `System Error: ${error.message}`
            }, { status: isBizVio ? 403 : 500 });
        }
    });
}

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { syncAllStudentLedgersAdmin } from "@/lib/services/fee-service-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        const isSuperAdmin = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.email?.includes("admin");
        if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { academicYearId } = body;

        if (!academicYearId) return NextResponse.json({ error: "Academic Year ID Required" }, { status: 400 });

        console.log(`[FeeSync] Initiating Server-Side Fee Sync for year ${academicYearId}`);
        const count = await syncAllStudentLedgersAdmin(academicYearId);

        return NextResponse.json({ success: true, count });
    } catch (error: any) {
        console.error("Fee Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

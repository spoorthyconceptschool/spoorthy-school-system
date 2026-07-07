import { NextRequest, NextResponse } from "next/server";
import { seedDemoData } from "@/lib/demo-data";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        let branchId = "W4ZEOJXUpmccvyffIaIo"; // fallback default branch if not authed

        const urlBranchId = req.nextUrl.searchParams.get("branchId");
        if (urlBranchId && urlBranchId !== "global") {
            branchId = urlBranchId;
        } else if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split("Bearer ")[1];
            try {
                const decodedToken = await adminAuth.verifyIdToken(token);
                let resolvedBranchId = decodedToken.schoolId || decodedToken.branchId;
                if (!resolvedBranchId) {
                    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
                    resolvedBranchId = userDoc.data()?.schoolId || userDoc.data()?.branchId;
                }
                if (resolvedBranchId && resolvedBranchId !== "global") {
                    branchId = resolvedBranchId;
                }
            } catch (authErr: any) {
                console.warn("[SetupData] Auth token verification failed, using fallback branch ID:", authErr.message);
            }
        }

        console.log(`[SetupData Route] Seeding data for branchId: ${branchId}`);
        await seedDemoData(branchId);
        return NextResponse.json({ success: true, message: `Data seeded successfully with updated ecosystem for branch ${branchId}.` });
    } catch (error: any) {
        console.error("Seed API Failure:", error);
        return NextResponse.json({
            success: false,
            error: "Failed to seed demo data. Check server logs.",
            details: error.message
        }, { status: 200 }); // Status 200 to prevent HTML error pages
    }
}

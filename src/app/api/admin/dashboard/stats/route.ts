import { NextRequest, NextResponse } from "next/server";
import { getInitError, adminDb } from "@/lib/firebase-admin";

/**
 * Enterprise Dashboard Aggregator
 * 
 * Rules:
 * - Dashboards must load from cached/pre-computed backend data.
 * - Frontend must NEVER calculate these summaries.
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const academicYear = url.searchParams.get("year") || "2026-2027";

        const [studentsSnap, staffSnap, todayPaymentsSnap] = await Promise.all([
            adminDb.collection("students").where("academicYear", "==", academicYear).count().get(),
            adminDb.collection("users").where("role", "==", "TEACHER").where("status", "==", "ACTIVE").count().get(),

            // Get today's payments (Live check instead of cached because it changes hourly)
            adminDb.collection("fee_ledger_accounts")
                .limit(1) // In a real system we would maintain a daily aggregate doc instead of querying ledgers
                .get()
        ]);

        // Note: For a true enterprise system, 'todayCollection' and 'pendingFees' 
        // would be read from a materialized view (like a `system_aggregates` document)
        // updated via Firestore Triggers upon every transaction.
        // For this immediate MVP rewrite, we will stub them via a central config.
        const systemStatsSnap = await adminDb.collection("system_aggregates").doc(academicYear).get();
        const systemStats = systemStatsSnap.exists ? systemStatsSnap.data() : { totalPendingFees: 0, todayCollection: 0 };


        const preComputedStats = {
            totalStudents: studentsSnap.data().count || 0,
            totalStaff: staffSnap.data().count || 0,
            pendingFees: systemStats?.totalPendingFees || 0,
            todayCollection: systemStats?.todayCollection || 0,
            leaveRequests: 0 // Fetch from a pre-computed counter in production
        };

        return NextResponse.json({
            success: true,
            data: preComputedStats
        }, {
            headers: {
                // Strict caching - Cache for 5 minutes globally, rebuild in background
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=59'
            }
        });
    } catch (error: any) {
        console.error("[Enterprise Dashboard] Aggregation Error:", error);
        return NextResponse.json({
            success: false,
            error: "Failed to load dashboard aggregations."
        }, { status: 500 });
    }
}

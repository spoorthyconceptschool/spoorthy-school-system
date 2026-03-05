import { NextRequest, NextResponse } from "next/server";
import { getInitError, adminDb, adminRtdb } from "@/lib/firebase-admin";

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

        const [studentsSnap, staffSnap, classesSnap] = await Promise.all([
            adminDb.collection("students").where("status", "==", "ACTIVE").count().get(),
            adminDb.collection("users").where("role", "==", "TEACHER").where("status", "==", "ACTIVE").count().get(),
            adminRtdb.ref("master/classes").get()
        ]);

        const classesData = classesSnap.val() || {};
        const totalClasses = Object.keys(classesData).length;

        const systemStatsSnap = await adminDb.collection("system_aggregates").doc(academicYear).get();
        const systemStats = systemStatsSnap.exists ? systemStatsSnap.data() : { totalPendingFees: 0, todayCollection: 0 };


        const preComputedStats = {
            totalStudents: studentsSnap.data().count || 0,
            totalStaff: staffSnap.data().count || 0,
            totalClasses: totalClasses,
            pendingFees: systemStats?.totalPendingFees || 0,
            todayCollection: systemStats?.todayCollection || 0,
            leaveRequests: 0
        };

        console.log(`[Dashboard Stats] year=${academicYear} totalStudents=${studentsSnap.data().count}`);

        return NextResponse.json({
            success: true,
            data: preComputedStats
        }, {
            headers: {
                // No-cache: counts need to be real-time
                'Cache-Control': 'no-cache, no-store, must-revalidate'
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

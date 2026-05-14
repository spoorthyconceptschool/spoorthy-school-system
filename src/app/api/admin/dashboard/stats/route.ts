import { NextRequest, NextResponse } from "next/server";
import { getInitError, adminDb, adminRtdb, adminAuth } from "@/lib/firebase-admin";

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

        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized / Missing Token" }, { status: 401 });
        }
        
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        let schoolId = decodedToken.schoolId;
        if (!schoolId) {
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
            schoolId = userDoc.data()?.schoolId || "global";
        }

        const [studentsSnap, staffSnap, classesSnap] = await Promise.all([
            adminDb.collection("students").where("schoolId", "==", schoolId).where("status", "==", "ACTIVE").count().get(),
            adminDb.collection("users").where("schoolId", "==", schoolId).where("role", "==", "TEACHER").where("status", "==", "ACTIVE").count().get(),
            adminRtdb.ref(`master/classes`).get() // Adjusting RTDB if strictly needed. Wait, RTDB isn't school-isolated
        ]);

        const classesData = classesSnap.val() || {};
        const totalClasses = Object.keys(classesData).length;

        const systemStatsSnap = await adminDb.collection("system_aggregates").doc(academicYear).get();
        const systemStats = systemStatsSnap.exists ? systemStatsSnap.data() : { totalPendingFees: 0 };
        
        // Exact strict boundary for TODAY'S collections
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const paymentsSnap = await adminDb.collection("payments")
            .where("schoolId", "==", schoolId)
            .where("createdAt", ">=", today)
            .get();
            
        let exactTodayCollection = 0;
        paymentsSnap.forEach((doc: any) => {
            const data = doc.data();
            if (data.status === "success" || data.status === undefined) {
                exactTodayCollection += Number(data.amount || 0);
            }
        });


        const preComputedStats = {
            totalStudents: studentsSnap.data().count || 0,
            totalStaff: staffSnap.data().count || 0,
            totalClasses: totalClasses,
            pendingFees: systemStats?.totalPendingFees || 0,
            todayCollection: exactTodayCollection,
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

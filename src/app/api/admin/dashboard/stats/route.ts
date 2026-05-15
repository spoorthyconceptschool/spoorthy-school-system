import { NextRequest, NextResponse } from "next/server";
import { getInitError, adminDb, adminRtdb, adminAuth, Timestamp } from "@/lib/firebase-admin";

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
        const academicYear = url.searchParams.get("year") || "2025-2026";

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

        // --- ROBUST ENTERPRISE AGGREGATION ---
        // If schoolId is "global", we query ALL data for the school system.
        // If it's a specific branch ID, we isolate.
        const isGlobal = schoolId === "global";

        let studentsBaseQ = adminDb.collection("students").where("status", "==", "ACTIVE");
        let teachersBaseQ = adminDb.collection("teachers").where("status", "==", "ACTIVE");
        let staffBaseQ = adminDb.collection("staff").where("status", "==", "ACTIVE");
        
        const [studentsSnap, teachersSnap, staffSnap, classesSnap, leavesSnap] = await Promise.all([
            studentsBaseQ.get(), // Get full snapshot for memory filtering if needed
            teachersBaseQ.get(),
            staffBaseQ.get(),
            adminDb.collection("master_classes").get(),
            adminDb.collection("leave_requests").where("status", "==", "PENDING").get()
        ]);

        // --- IN-MEMORY FILTERING TO AVOID COMPOSITE INDEXES ---
        const filteredStudents = isGlobal ? studentsSnap.docs : studentsSnap.docs.filter(d => d.data().branchId === schoolId || !d.data().branchId);
        const filteredTeachers = isGlobal ? teachersSnap.docs : teachersSnap.docs.filter(d => d.data().schoolId === schoolId || !d.data().schoolId);
        const filteredStaff = isGlobal ? staffSnap.docs : staffSnap.docs.filter(d => d.data().schoolId === schoolId || !d.data().schoolId);
        const filteredLeaves = isGlobal ? leavesSnap.docs : leavesSnap.docs.filter(d => d.data().schoolId === schoolId || !d.data().schoolId);

        const totalClasses = classesSnap.size;

        const systemStatsSnap = await adminDb.collection("system_aggregates").doc(academicYear).get();
        const systemStats = systemStatsSnap.exists ? systemStatsSnap.data() : { totalPendingFees: 0 };
        
        // --- TIMEZONE-SAFE TODAY WINDOW ---
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
        let paymentsQ = adminDb.collection("payments")
            .where("createdAt", ">=", Timestamp.fromDate(todayStart))
            .where("createdAt", "<=", Timestamp.fromDate(todayEnd));
            
        // paymentsQ usually has an index for createdAt, but schoolId would require composite.
        const paymentsSnap = await paymentsQ.get();
        let exactTodayCollection = 0;
        paymentsSnap.forEach((doc: any) => {
            const data = doc.data();
            const matchesSchool = isGlobal || data.branchId === schoolId || !data.branchId;
            if (matchesSchool && (data.status === "success" || data.status === "SUCCESS" || !data.status)) {
                exactTodayCollection += Number(data.amount || 0);
            }
        });

        // --- ATTENDANCE AGGREGATION (TODAY) ---
        const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Query only by date to avoid index requirement
        const attendanceSnap = await adminDb.collection("attendance_daily").where("date", "==", todayStr).get();
        
        let presentStudents = 0;
        let presentTeachers = 0;
        let presentStaff = 0;
        
        let absentStudents = 0;
        let absentTeachers = 0;
        let absentStaff = 0;

        attendanceSnap.forEach(doc => {
            const data = doc.data();
            const matchesSchool = isGlobal || data.branchId === schoolId || !data.branchId;
            if (!matchesSchool) return;

            const pCount = data.stats?.present || 0;
            const aCount = data.stats?.absent || 0;
            
            if (data.type === "TEACHERS") {
                presentTeachers += pCount;
                absentTeachers += aCount;
            } else if (data.type === "STAFF") {
                presentStaff += pCount;
                absentStaff += aCount;
            } else {
                presentStudents += pCount;
                absentStudents += aCount;
            }
        });

        const filterClass = url.searchParams.get("classId");
        const filterSection = url.searchParams.get("section");
        const filterVillage = url.searchParams.get("village");

        const matchingStudentIds = new Set(
            filteredStudents
                .filter(doc => {
                    const data = doc.data();
                    if (filterClass && data.classId !== filterClass) return false;
                    if (filterSection && data.section !== filterSection) return false;
                    if (filterVillage && data.village !== filterVillage) return false;
                    return true;
                })
                .map(doc => {
                    const data = doc.data();
                    return data.schoolId || doc.id;
                })
        );

        // --- FINANCIAL AGGREGATION (REAL-TIME LEDGER SCAN) ---
        const ledgersSnap = await adminDb.collection("student_fee_ledgers")
            .where("academicYearId", "==", academicYear)
            .get();

        const finance = {
            totalFee: 0,
            totalPaid: 0,
            hostelFee: 0,
            hostelPaid: 0,
            customFee: 0,
            customPaid: 0,
            transportFee: 0,
            transportPaid: 0,
            schoolFee: 0,
            schoolPaid: 0,
            terms: {} as Record<string, { total: number; paid: number }>
        };

        ledgersSnap.forEach(doc => {
            const data = doc.data();
            const matchesSchool = isGlobal || data.branchId === schoolId || !data.branchId;
            if (!matchesSchool) return;

            // Apply Filter Intersection
            if (!matchingStudentIds.has(data.studentId)) return;

            finance.totalFee += Number(data.totalFee || 0);
            finance.totalPaid += Number(data.totalPaid || 0);

            (data.items || []).forEach((item: any) => {
                const amt = Number(item.amount || 0);
                const paid = Number(item.paidAmount || 0);
                
                if (item.type === "TRANSPORT") {
                    finance.transportFee += amt;
                    finance.transportPaid += paid;
                } else if (item.type === "CUSTOM") {
                    finance.customFee += amt;
                    finance.customPaid += paid;
                } else if (item.type === "TERM") {
                    finance.schoolFee += amt;
                    finance.schoolPaid += paid;
                    
                    const termName = item.name || "Unknown Term";
                    if (!finance.terms[termName]) {
                        finance.terms[termName] = { total: 0, paid: 0 };
                    }
                    finance.terms[termName].total += amt;
                    finance.terms[termName].paid += paid;
                } else if (item.name?.toUpperCase().includes("HOSTEL") || item.type === "HOSTEL") {
                    finance.hostelFee += amt;
                    finance.hostelPaid += paid;
                }
            });
        });

        const preComputedStats = {
            totalStudents: filteredStudents.length,
            totalTeachers: filteredTeachers.length,
            totalStaff: filteredStaff.length,
            totalClasses: totalClasses,
            pendingFees: systemStats?.totalPendingFees || 0,
            todayCollection: exactTodayCollection,
            leaveRequests: filteredLeaves.length,
            presentStudents,
            presentTeachers,
            presentStaff,
            absentStudents,
            absentTeachers,
            absentStaff,
            pendingStudents: filteredStudents.length - (presentStudents + absentStudents),
            finance
        };

        console.log(`[Dashboard Stats] year=${academicYear} isGlobal=${isGlobal} totalStudents=${preComputedStats.totalStudents} todayColl=${exactTodayCollection}`);

        return NextResponse.json({
            success: true,
            data: preComputedStats
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
    } catch (error: any) {
        console.error("[Enterprise Dashboard] Aggregation Error Details:", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        return NextResponse.json({
            success: false,
            error: "Failed to load dashboard aggregations.",
            details: error.message,
            help: error.message?.includes("index") ? "This query requires a Firestore composite index. Check Firebase Console logs for the index creation link." : undefined
        }, { status: 500 });
    }
}

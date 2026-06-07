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
        let academicYear = url.searchParams.get("year");

        // --- FETCH ACTIVE YEAR FROM CONFIG IF MISSING ---
        if (!academicYear) {
            const configSnap = await adminDb.collection("config").doc("academic_years").get();
            academicYear = configSnap.data()?.currentYear || "2026-2027";
        }

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
        // To prevent leaking old data to new branches, we consider empty branchId to belong to the HQ/Default branch.
        const branchDoc = !isGlobal ? await adminDb.collection("branches").doc(schoolId).get() : null;
        const isOriginalBranch = branchDoc?.exists ? branchDoc.data()?.branchCode === "SHS" : false;

        const matchesBranch = (d: any) => {
            if (isGlobal) return true;
            const bId = d.data().branchId;
            return bId === schoolId || (isOriginalBranch && !bId);
        };

        const filteredStudents = studentsSnap.docs.filter(matchesBranch);
        const filteredTeachers = teachersSnap.docs.filter(matchesBranch);
        const filteredStaff = staffSnap.docs.filter(matchesBranch);
        const filteredLeaves = leavesSnap.docs.filter(matchesBranch);

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
            const bId = data.branchId;
            const matchesSchool = isGlobal || bId === schoolId || (isOriginalBranch && !bId);
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
            const bId = data.branchId;
            const matchesSchool = isGlobal || bId === schoolId || (isOriginalBranch && !bId);
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
            customFees: {} as Record<string, { total: number; paid: number }>,
            terms: {} as Record<string, { total: number; paid: number }>
        };

        ledgersSnap.forEach((doc: any) => {
            const data = doc.data();
            const bId = data.branchId;
            const matchesSchool = isGlobal || bId === schoolId || (isOriginalBranch && !bId);
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
                } else if (item.type === "TERM") {
                    finance.schoolFee += amt;
                    finance.schoolPaid += paid;
                    
                    const termName = item.name || "Unknown Term";
                    if (!finance.terms[termName]) {
                        finance.terms[termName] = { total: 0, paid: 0 };
                    }
                    finance.terms[termName].total += amt;
                    finance.terms[termName].paid += paid;
                } else {
                    // Dynamically group custom or other extra fees by their exact name
                    const feeName = item.name || "Custom Fee";
                    if (!finance.customFees[feeName]) {
                        finance.customFees[feeName] = { total: 0, paid: 0 };
                    }
                    finance.customFees[feeName].total += amt;
                    finance.customFees[feeName].paid += paid;

                    // Legacy metric fallbacks for full system compatibility
                    if (item.name?.toUpperCase().includes("HOSTEL") || item.type === "HOSTEL") {
                        finance.hostelFee += amt;
                        finance.hostelPaid += paid;
                    } else {
                        finance.customFee += amt;
                        finance.customPaid += paid;
                    }
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
            pendingStudents: Math.max(0, filteredStudents.length - (presentStudents + absentStudents)),
            pendingTeachers: Math.max(0, filteredTeachers.length - (presentTeachers + absentTeachers)),
            pendingStaff: Math.max(0, filteredStaff.length - (presentStaff + absentStaff)),
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

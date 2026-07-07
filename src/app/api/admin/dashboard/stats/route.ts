import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminRtdb, adminAuth, Timestamp } from "@/lib/firebase-admin";

/**
 * Enterprise Dashboard Aggregator - Optimized V2 (Zero Latency)
 * 
 * Rules:
 * - Use native Firestore count queries for total students/teachers/staff.
 * - Cache bulky ledger calculations in system_aggregates with a 5-minute TTL.
 * - Avoid fetching full collections of 30,000 documents to count them.
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
        
        let schoolId = decodedToken.schoolId || decodedToken.branchId || decodedToken.SchoolId || decodedToken.BranchId;
        let role = decodedToken.role || decodedToken.Role;
        if (!schoolId) {
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
            const uData = userDoc.data();
            schoolId = uData?.schoolId || uData?.SchoolId || uData?.branchId || uData?.BranchId || "global";
            role = uData?.role || uData?.Role || role;
        }

        const requestedBranchId = url.searchParams.get("branchId");
        if (requestedBranchId && (schoolId === "global" || role === "SUPER_ADMIN")) {
            schoolId = requestedBranchId;
        }


        const isGlobal = schoolId === "global";

        // --- OPTIMIZED FAST COUNT QUERIES ---
        let studentsBaseQ = adminDb.collection("students").where("status", "==", "ACTIVE");
        let teachersBaseQ = adminDb.collection("teachers").where("status", "==", "ACTIVE");
        let staffBaseQ = adminDb.collection("staff").where("status", "==", "ACTIVE");
        let leavesBaseQ = adminDb.collection("leave_requests").where("status", "==", "PENDING");

        if (!isGlobal) {
            studentsBaseQ = studentsBaseQ.where("branchId", "==", schoolId);
            teachersBaseQ = teachersBaseQ.where("branchId", "==", schoolId);
            staffBaseQ = staffBaseQ.where("branchId", "==", schoolId);
            leavesBaseQ = leavesBaseQ.where("branchId", "==", schoolId);
        }

        const [studentsCountSnap, teachersCountSnap, staffCountSnap, leavesCountSnap, classesSnap] = await Promise.all([
            studentsBaseQ.count().get(),
            teachersBaseQ.count().get(),
            staffBaseQ.count().get(),
            leavesBaseQ.count().get(),
            adminDb.collection("master_classes").get()
        ]);

        const totalStudents = studentsCountSnap.data().count;
        const totalTeachers = teachersCountSnap.data().count;
        const totalStaff = staffCountSnap.data().count;
        const leaveRequests = leavesCountSnap.data().count;
        const totalClasses = classesSnap.size;

        // --- BRANCHES LIST & RESOLUTION ---
        const allBranchesSnap = await adminDb.collection("branches").get();
        const totalSchools = allBranchesSnap.size;
        
        let defaultBranchId = "unknown";
        const branchWiseStats: Record<string, { branchId: string; branchName: string; totalStudents: number; revenue: number; pendingFees: number }> = {};
        
        allBranchesSnap.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.branchCode === "SHS") defaultBranchId = doc.id;
            branchWiseStats[doc.id] = {
                branchId: doc.id,
                branchName: data.branchName || doc.id,
                totalStudents: 0,
                revenue: 0,
                pendingFees: 0
            };
        });

        // Parallelize branch-wise student counts for global view in 1 go
        if (isGlobal) {
            await Promise.all(allBranchesSnap.docs.map(async (doc: any) => {
                const bId = doc.id;
                const countSnap = await adminDb.collection("students")
                    .where("status", "==", "ACTIVE")
                    .where("branchId", "==", bId)
                    .count()
                    .get();
                if (branchWiseStats[bId]) {
                    branchWiseStats[bId].totalStudents = countSnap.data().count;
                }
            }));
        } else {
            if (branchWiseStats[schoolId]) {
                branchWiseStats[schoolId].totalStudents = totalStudents;
            }
        }

        // --- TIMEZONE-SAFE TODAY WINDOW ---
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
        let paymentsQ = adminDb.collection("payments")
            .where("createdAt", ">=", Timestamp.fromDate(todayStart))
            .where("createdAt", "<=", Timestamp.fromDate(todayEnd));
        
        const paymentsSnap = await paymentsQ.get();
        let exactTodayCollection = 0;
        paymentsSnap.forEach((doc: any) => {
            const data = doc.data();
            const bId = data.branchId;
            const matchesSchool = isGlobal || bId === schoolId;
            if (matchesSchool && (data.status === "success" || data.status === "SUCCESS" || !data.status)) {
                exactTodayCollection += Number(data.amount || 0);
            }
        });

        // --- ATTENDANCE AGGREGATION (TODAY) ---
        const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        let attendanceQ = adminDb.collection("attendance_daily").where("date", "==", todayStr);
        if (!isGlobal) {
            attendanceQ = attendanceQ.where("branchId", "==", schoolId);
        }
        const attendanceSnap = await attendanceQ.get();
        
        let presentStudents = 0;
        let presentTeachers = 0;
        let presentStaff = 0;
        
        let absentStudents = 0;
        let absentTeachers = 0;
        let absentStaff = 0;

        attendanceSnap.forEach((doc: any) => {
            const data = doc.data();
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

        // --- FINANCIAL FILTER PARAMETERS ---
        const filterClass = url.searchParams.get("classId");
        const filterSection = url.searchParams.get("section");
        const filterVillage = url.searchParams.get("village");

        const isFiltered = !!(filterClass || filterSection || filterVillage);

        // --- SERVER-SIDE LEDGER CACHE ---
        const cacheDocId = `finance_aggregate_${schoolId}_${academicYear}`;
        const cacheDocRef = adminDb.collection("system_aggregates").doc(cacheDocId);
        
        let finance = {
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
            terms: {} as Record<string, { total: number; paid: number }>,
            feeTypeAnalytics: {} as Record<string, { pending: number; partial: number; noDue: number; totalAccounts: number }>
        };

        const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min TTL
        let useServerCache = false;

        // Only use server cache if no UI filters are applied
        if (!isFiltered) {
            try {
                const cacheSnap = await cacheDocRef.get();
                if (cacheSnap.exists) {
                    const cacheData = cacheSnap.data();
                    const ageMs = Date.now() - new Date(cacheData.updatedAt || 0).getTime();
                    if (ageMs < CACHE_TTL_MS) {
                        finance = cacheData.finance || finance;
                        useServerCache = true;
                    }
                }
            } catch (err) {
                console.warn("[DashboardStats API] Failed reading cache doc:", err);
            }
        }

        if (!useServerCache) {
            // Build filtered query to avoid fetching all 30,000 ledger docs if UI filters are active
            let ledgersQ = adminDb.collection("student_fee_ledgers").where("academicYearId", "==", academicYear);
            if (!isGlobal) {
                ledgersQ = ledgersQ.where("branchId", "==", schoolId);
            }
            if (filterClass && filterClass !== "all") {
                ledgersQ = ledgersQ.where("classId", "==", filterClass);
            }
            if (filterSection && filterSection !== "all") {
                ledgersQ = ledgersQ.where("sectionId", "==", filterSection);
            }

            const ledgersSnap = await ledgersQ.get();

            // Fetch students list for village filtering if necessary
            let villageMatchedStudentIds = new Set<string>();
            if (filterVillage && filterVillage !== "all") {
                const studsSnap = await adminDb.collection("students")
                    .where("branchId", "==", schoolId)
                    .where("villageId", "==", filterVillage)
                    .get();
                studsSnap.forEach((d: any) => villageMatchedStudentIds.add(d.id));
            }

            ledgersSnap.forEach((doc: any) => {
                const data = doc.data();
                
                // If village filter is applied, skip ledgers for other students
                if (filterVillage && filterVillage !== "all" && !villageMatchedStudentIds.has(data.studentId)) {
                    return;
                }

                finance.totalFee += Number(data.totalFee || 0);
                finance.totalPaid += Number(data.totalPaid || 0);

                const resolved = data.branchId || schoolId;
                if (branchWiseStats[resolved]) {
                    branchWiseStats[resolved].revenue += Number(data.totalPaid || 0);
                    branchWiseStats[resolved].pendingFees += Math.max(0, Number(data.totalFee || 0) - Number(data.totalPaid || 0));
                }

                (data.items || []).forEach((item: any) => {
                    const amt = Number(item.amount || 0);
                    const paid = Number(item.paidAmount || 0);
                    
                    let feeTypeLabel = "School Fee";
                    if (item.type === "TRANSPORT") {
                        finance.transportFee += amt;
                        finance.transportPaid += paid;
                        feeTypeLabel = "Transport";
                    } else if (item.type === "TERM") {
                        finance.schoolFee += amt;
                        finance.schoolPaid += paid;
                        feeTypeLabel = item.name || "School Fee";
                        
                        const termName = item.name || "Unknown Term";
                        if (!finance.terms[termName]) {
                            finance.terms[termName] = { total: 0, paid: 0 };
                        }
                        finance.terms[termName].total += amt;
                        finance.terms[termName].paid += paid;
                    } else {
                        const feeName = item.name || "Custom Fee";
                        feeTypeLabel = feeName;
                        if (!finance.customFees[feeName]) {
                            finance.customFees[feeName] = { total: 0, paid: 0 };
                        }
                        finance.customFees[feeName].total += amt;
                        finance.customFees[feeName].paid += paid;

                        if (item.name?.toUpperCase().includes("HOSTEL") || item.type === "HOSTEL") {
                            finance.hostelFee += amt;
                            finance.hostelPaid += paid;
                        } else {
                            finance.customFee += amt;
                            finance.customPaid += paid;
                        }
                    }

                    // Account stats calculation
                    if (!finance.feeTypeAnalytics[feeTypeLabel]) {
                        finance.feeTypeAnalytics[feeTypeLabel] = { pending: 0, partial: 0, noDue: 0, totalAccounts: 0 };
                    }
                    finance.feeTypeAnalytics[feeTypeLabel].totalAccounts++;
                    if (paid === 0) {
                        finance.feeTypeAnalytics[feeTypeLabel].pending++;
                    } else if (paid >= amt) {
                        finance.feeTypeAnalytics[feeTypeLabel].noDue++;
                    } else {
                        finance.feeTypeAnalytics[feeTypeLabel].partial++;
                    }
                });
            });

            // Write back base financials to the cache document (unfiltered only)
            if (!isFiltered) {
                try {
                    await cacheDocRef.set({
                        finance,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                } catch (err) {
                    console.warn("[DashboardStats API] Failed writing cache doc:", err);
                }
            }
        }

        const preComputedStats = {
            totalSchools: isGlobal ? totalSchools : 1,
            totalStudents,
            totalTeachers,
            totalStaff,
            totalClasses,
            pendingFees: Math.max(0, finance.totalFee - finance.totalPaid),
            todayCollection: exactTodayCollection,
            leaveRequests,
            presentStudents,
            presentTeachers,
            presentStaff,
            absentStudents,
            absentTeachers,
            absentStaff,
            pendingStudents: Math.max(0, totalStudents - (presentStudents + absentStudents)),
            pendingTeachers: Math.max(0, totalTeachers - (presentTeachers + absentTeachers)),
            pendingStaff: Math.max(0, totalStaff - (presentStaff + absentStaff)),
            finance,
            branchWiseStats: Object.values(branchWiseStats)
        };

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
            details: error.message
        }, { status: 500 });
    }
}

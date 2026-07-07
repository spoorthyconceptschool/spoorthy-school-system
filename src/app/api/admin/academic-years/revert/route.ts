import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        console.log("[AcademicYear] ⚡ Revert Transition Started");

        // 1. Authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        const isSuperAdmin = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.email?.includes("admin");
        if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        let schoolId = decodedToken.schoolId || decodedToken.branchId || decodedToken.SchoolId || decodedToken.BranchId;
        if (!schoolId) {
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
            const uData = userDoc.data();
            schoolId = uData?.schoolId || uData?.SchoolId || uData?.branchId || uData?.BranchId || "global";
        }

        const body = await req.json();
        const { targetYear } = body;

        if (!targetYear) return NextResponse.json({ error: "Target Year Required" }, { status: 400 });

        // 2. Fetch Current State
        const configRef = adminDb.collection("config").doc("academic_years");
        const configSnap = await configRef.get();
        const configData = configSnap.data();
        const currentYear = configSnap.exists ? (configData?.currentYear || "2026-2027") : "2026-2027";

        if (targetYear === currentYear) {
            return NextResponse.json({ error: "Cannot revert to the same year." }, { status: 400 });
        }

        console.log(`[Revert Transition] ${currentYear} -> ${targetYear}`);

        // 3. Prepare Parallel Batch Processing
        const batches: FirebaseFirestore.WriteBatch[] = [adminDb.batch()];
        let currentBatchIndex = 0;
        let ops = 0;

        const addOpToBatch = (opFn: (b: FirebaseFirestore.WriteBatch) => void) => {
            if (ops >= 450) {
                batches.push(adminDb.batch());
                currentBatchIndex++;
                ops = 0;
            }
            opFn(batches[currentBatchIndex]);
            ops++;
        };

        // A. Process Students & Fee Ledgers
        console.log("[Revert Transition] Reverting Students & Deleting Fees...");

        let studentsQ = adminDb.collection("students").where("academicYear", "==", currentYear);
        if (schoolId && schoolId !== "global") {
            studentsQ = studentsQ.where("branchId", "==", schoolId);
        }
        const studentsSnap = await studentsQ.get();

        // Pre-fetch all previous year's ledgers to prevent N+1 Firestore calls
        let ledgersQ = adminDb.collection("student_fee_ledgers").where("academicYearId", "==", targetYear);
        if (schoolId && schoolId !== "global") {
            ledgersQ = ledgersQ.where("branchId", "==", schoolId);
        }
        const ledgersSnap = await ledgersQ.get();
        const ledgersMap = new Map<string, any>();
        ledgersSnap.docs.forEach((doc: any) => {
            const data = doc.data();
            const studentId = data.studentId;
            if (studentId) ledgersMap.set(studentId, data);
        });

        let revertedCount = 0;

        for (const studentDoc of studentsSnap.docs) {
            const student = studentDoc.data();
            const studentRef = studentDoc.ref;
            const sId = student.schoolId || student.id || studentDoc.id;

            // Find the student's ledger in the target year to restore their previous class
            const oldLedger = ledgersMap.get(sId);
            
            let restoredClassId = student.classId;
            let restoredClassName = student.className;
            let restoredStatus = student.previousYearStatus || "ACTIVE";

            if (oldLedger) {
                if (oldLedger.classId) restoredClassId = oldLedger.classId;
                if (oldLedger.className) restoredClassName = oldLedger.className;
            }

            // Revert the student document
            addOpToBatch((b) => {
                b.update(studentRef, {
                    academicYear: targetYear,
                    classId: restoredClassId,
                    className: restoredClassName,
                    status: restoredStatus,
                    previousYearStatus: null, // Clear this as we went back
                    updatedAt: new Date().toISOString()
                });
            });

            // Delete the fee ledger for the current (incorrect) year
            const currentLedgerRef = adminDb.collection("student_fee_ledgers").doc(`${sId}_${currentYear}`);
            addOpToBatch((b) => {
                b.delete(currentLedgerRef);
            });

            revertedCount++;
        }

        // B. Delete Teaching Assignments for the current year
        let assignmentsQ = adminDb.collection("teaching_assignments").where("yearId", "==", currentYear);
        if (schoolId && schoolId !== "global") {
            assignmentsQ = assignmentsQ.where("branchId", "==", schoolId);
        }
        const assignmentsSnap = await assignmentsQ.get();
        for (const doc of assignmentsSnap.docs) {
            addOpToBatch((b) => {
                b.delete(doc.ref);
            });
        }

        // C. Delete Class Timetables for the current year
        let timetablesQ = adminDb.collection("class_timetables").where("yearId", "==", currentYear);
        if (schoolId && schoolId !== "global") {
            timetablesQ = timetablesQ.where("branchId", "==", schoolId);
        }
        const timetablesSnap = await timetablesQ.get();
        for (const doc of timetablesSnap.docs) {
            addOpToBatch((b) => {
                b.delete(doc.ref);
            });
        }

        // D. Update Config
        const newHistory = (configData?.history || []).filter((h: any) => h.year !== targetYear);
        addOpToBatch((b) => {
            b.update(configRef, {
                currentYear: targetYear,
                currentYearStartDate: newHistory.length > 0 ? newHistory[newHistory.length - 1].startDate : "2025-06-01",
                history: newHistory,
                updatedAt: new Date().toISOString()
            });
        });

        console.log(`[Revert Transition] Committing ${batches.length} batches in parallel...`);
        await Promise.all(batches.map(b => b.commit()));

        console.log(`[Revert Transition] Completed successfully. Reverted ${revertedCount} students.`);

        return NextResponse.json({ 
            success: true, 
            message: `Transition reverted. ${revertedCount} students restored to ${targetYear}.` 
        });

    } catch (error: any) {
        console.error("[Revert Transition Error]:", error);
        return NextResponse.json({ error: error.message || "Failed to revert transition." }, { status: 500 });
    }
}

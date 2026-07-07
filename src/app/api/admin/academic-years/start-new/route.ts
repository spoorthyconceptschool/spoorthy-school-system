
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Helper function replaced by dynamic loading inside POST handler

export async function POST(req: NextRequest) {
    try {
        console.log("[AcademicYear] ⚡ Transition Lifecycle Started");

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
        const { newYearLabel } = body;

        if (!newYearLabel) return NextResponse.json({ error: "Year Label Required" }, { status: 400 });

        // 2. Fetch Current State
        const configRef = adminDb.collection("config").doc("academic_years");
        const configSnap = await configRef.get();
        const currentYear = configSnap.exists ? (configSnap.data()?.currentYear || "2025-2026") : "2025-2026";

        if (newYearLabel === currentYear) {
            return NextResponse.json({ error: "Cannot transition to the same year." }, { status: 400 });
        }

        console.log(`[Transition] ${currentYear} -> ${newYearLabel}`);

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

        // A. Copy Teaching Assignments & Timetables
        console.log("[Transition] Copying Staffing Assignments...");
        let assignmentsQ = adminDb.collection("teaching_assignments").where("yearId", "==", currentYear);
        if (schoolId && schoolId !== "global") {
            assignmentsQ = assignmentsQ.where("branchId", "==", schoolId);
        }
        const assignmentsSnap = await assignmentsQ.get();
        for (const doc of assignmentsSnap.docs) {
            const data = doc.data();
            const classId = data.classId;
            if (!classId) continue;
            const newRef = adminDb.collection("teaching_assignments").doc(`${newYearLabel}_${classId}`);
            addOpToBatch((b) => {
                b.set(newRef, {
                    ...data,
                    yearId: newYearLabel,
                    updatedAt: new Date().toISOString()
                });
            });
        }

        let timetablesQ = adminDb.collection("class_timetables").where("yearId", "==", currentYear);
        if (schoolId && schoolId !== "global") {
            timetablesQ = timetablesQ.where("branchId", "==", schoolId);
        }
        const timetablesSnap = await timetablesQ.get();
        for (const doc of timetablesSnap.docs) {
            const data = doc.data();
            const classId = data.classId;
            const sectionId = data.sectionId;
            if (!classId || !sectionId) continue;
            const newRef = adminDb.collection("class_timetables").doc(`${newYearLabel}_${classId}_${sectionId}`);
            addOpToBatch((b) => {
                b.set(newRef, {
                    ...data,
                    yearId: newYearLabel,
                    updatedAt: new Date().toISOString()
                });
            });
        }

        // B. Process Students & Fee Ledgers
        console.log("[Transition] Processing Students & Fees...");

        // Load all classes dynamically and sort by order field
        let classesQ = adminDb.collection("classes");
        if (schoolId && schoolId !== "global") {
            classesQ = classesQ.where("branchId", "==", schoolId);
        }
        const classesSnap = await classesQ.get();
        const classesList = classesSnap.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.data().name,
            order: Number(doc.data().order) || 99
        })).sort((a: any, b: any) => a.order - b.order);

        const getNextClass = (currentClassId: string) => {
            const current = classesList.find((c: any) => c.id === currentClassId || c.id === `${schoolId}_${currentClassId}`);
            if (!current) return null;
            const next = classesList.find((c: any) => c.order === current.order + 1);
            return next || null;
        };

        // Fetch students - Ideally filter by currentYear if data is clean, else fetch all active
        // For robustness, we check all students and migrate those who match criteria
        let studentsQ = adminDb.collection("students");
        if (schoolId && schoolId !== "global") {
            studentsQ = studentsQ.where("branchId", "==", schoolId);
        }
        const studentsSnap = await studentsQ.get();

        // Bulk fetch all old fee ledgers for the active year to prevent N+1 sequential database roundtrips
        let ledgersQ = adminDb.collection("student_fee_ledgers").where("academicYearId", "==", currentYear);
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

        let promotedCount = 0;
        let retainedCount = 0;
        let graduatedCount = 0;

        for (const studentDoc of studentsSnap.docs) {
            const student = studentDoc.data();
            const studentRef = studentDoc.ref;
            const sId = student.schoolId || student.id || studentDoc.id;

            // Skip if already in the target year (idempotency)
            if (student.academicYear === newYearLabel) continue;

            // Skip inactive/alumni unless we want to bring them back? No.
            if (student.status === "ALUMNI" || student.status === "INACTIVE") continue;

            // 1. Get Previous Balance from pre-fetched map
            const lData = ledgersMap.get(sId);
            let pendingBalance = 0;
            if (lData) {
                const total = Number(lData.totalFee || 0);
                const paid = Number(lData.totalPaid || 0);
                pendingBalance = total - paid;
            }

            // 2. Promotion Logic
            // Default: Active students are promoted. Explicit "DETAINED" students are retained.
            let newClassId = student.classId || "unknown";
            let newClassName = student.className || "Unknown Class";
            let newStatus = "ACTIVE"; // The status in the NEW year

            const isDetained = student.status === "DETAINED" || student.promotionStatus === "RETAINED";

            if (!isDetained) {
                // Promote
                const next = getNextClass(student.classId || "");
                if (next) {
                    newClassId = next.id.includes("_") ? next.id.split("_").slice(1).join("_") : next.id;
                    newClassName = next.name;
                    promotedCount++;
                } else {
                    // No next class -> Graduate
                    newStatus = "ALUMNI";
                    graduatedCount++;
                }
            } else {
                // Retain in same class
                retainedCount++;
            }

            // 3. Update Student
            const updatePayload: any = {
                academicYear: newYearLabel,
                classId: newClassId,
                className: newClassName,
                status: newStatus,
                previousYearStatus: student.status || "ACTIVE",
                updatedAt: new Date().toISOString()
            };

            if (newStatus === "ALUMNI") {
                updatePayload.alumniYear = currentYear; // e.g. "2025-2026"
            } else {
                // All other class students promoted to their top order class with same section of their past year
                updatePayload.sectionId = student.sectionId || "";
                updatePayload.sectionName = student.sectionName || "";
            }

            addOpToBatch((b) => {
                b.update(studentRef, updatePayload);
            });

            // 4. Initialize New Ledger with Balance
            const newLedgerRef = adminDb.collection("student_fee_ledgers").doc(`${sId}_${newYearLabel}`);
            const items: any[] = [];
            if (pendingBalance > 0) {
                items.push({
                    id: "PREVIOUS_BALANCE",
                    type: "TOTAL",
                    name: `Previous Balance (${currentYear})`,
                    amount: pendingBalance,
                    paidAmount: 0,
                    status: "PENDING",
                    dueDate: new Date().toISOString().split('T')[0]
                });
            }

            addOpToBatch((b) => {
                b.set(newLedgerRef, {
                    studentId: sId,
                    academicYearId: newYearLabel,
                    classId: newClassId,
                    className: newClassName,
                    totalFee: pendingBalance,
                    totalPaid: 0,
                    status: "PENDING",
                    items: items,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            });
        }

        // C. Update System Config
        const updateData: any = {
            currentYear: newYearLabel,
            currentYearStartDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        if (currentYear && currentYear !== "Unknown") {
            updateData.history = FieldValue.arrayUnion({
                year: currentYear,
                archivedAt: new Date().toISOString(),
                promotedCount,
                archivedCount: retainedCount,
                stats: { promoted: promotedCount, detained: retainedCount, graduated: graduatedCount }
            });
        }

        updateData.upcoming = FieldValue.arrayRemove(newYearLabel);
        addOpToBatch((b) => {
            b.set(configRef, updateData, { merge: true });
        });

        console.log(`[Transition] Committing ${batches.length} batches in parallel...`);
        await Promise.all(batches.map(b => b.commit()));

        return NextResponse.json({
            success: true,
            message: `Transition to ${newYearLabel} Complete.`,
            stats: { promoted: promotedCount, retained: retainedCount, graduated: graduatedCount }
        });

    } catch (error: any) {
        console.error("Critical Transition Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

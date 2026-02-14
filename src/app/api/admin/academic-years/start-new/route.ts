
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const CLASSES_ORDER = [
    { id: "nursery", name: "Nursery", order: 1 },
    { id: "lkg", name: "LKG", order: 2 },
    { id: "ukg", name: "UKG", order: 3 },
    { id: "c1", name: "Class 1", order: 4 },
    { id: "c2", name: "Class 2", order: 5 },
    { id: "c3", name: "Class 3", order: 6 },
    { id: "c4", name: "Class 4", order: 7 },
    { id: "c5", name: "Class 5", order: 8 },
    { id: "c6", name: "Class 6", order: 9 },
    { id: "c7", name: "Class 7", order: 10 },
    { id: "c8", name: "Class 8", order: 11 },
    { id: "c9", name: "Class 9", order: 12 },
    { id: "c10", name: "Class 10", order: 13 }
];

function getNextClass(currentClassId: string) {
    const current = CLASSES_ORDER.find(c => c.id === currentClassId);
    if (!current) return null;
    const next = CLASSES_ORDER.find(c => c.order === current.order + 1);
    return next || null; // Return null if already at c10
}

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

        const body = await req.json();
        const { newYearLabel } = body;

        if (!newYearLabel) return NextResponse.json({ error: "Year Label Required" }, { status: 400 });

        // 2. Fetch Current State
        const configRef = adminDb.collection("config").doc("academic_years");
        const configSnap = await configRef.get();
        const currentYear = configSnap.exists ? configSnap.data()?.currentYear : "Unknown";

        if (newYearLabel === currentYear) {
            return NextResponse.json({ error: "Cannot transition to the same year." }, { status: 400 });
        }

        console.log(`[Transition] ${currentYear} -> ${newYearLabel}`);

        // 3. Prepare Batch Processing
        let batch = adminDb.batch();
        let ops = 0;

        const commitBatch = async () => {
            if (ops > 0) {
                await batch.commit();
                batch = adminDb.batch();
                ops = 0;
            }
        };

        // A. Copy Teaching Assignments & Timetables
        console.log("[Transition] Copying Staffing Assignments...");
        const assignmentsSnap = await adminDb.collection("teaching_assignments").where("yearId", "==", currentYear).get();
        for (const doc of assignmentsSnap.docs) {
            const data = doc.data();
            const classId = data.classId;
            const newRef = adminDb.collection("teaching_assignments").doc(`${newYearLabel}_${classId}`);
            batch.set(newRef, {
                ...data,
                yearId: newYearLabel,
                updatedAt: new Date().toISOString()
            });
            ops++;
            if (ops >= 400) await commitBatch();
        }

        const timetablesSnap = await adminDb.collection("class_timetables").where("yearId", "==", currentYear).get();
        for (const doc of timetablesSnap.docs) {
            const data = doc.data();
            const classId = data.classId;
            const sectionId = data.sectionId;
            const newRef = adminDb.collection("class_timetables").doc(`${newYearLabel}_${classId}_${sectionId}`);
            batch.set(newRef, {
                ...data,
                yearId: newYearLabel,
                updatedAt: new Date().toISOString()
            });
            ops++;
            if (ops >= 400) await commitBatch();
        }

        // B. Process Students & Fee Ledgers
        console.log("[Transition] Processing Students & Fees...");

        // Fetch students - Ideally filter by currentYear if data is clean, else fetch all active
        // For robustness, we check all students and migrate those who match criteria
        const studentsSnap = await adminDb.collection("students").get();

        let promotedCount = 0;
        let retainedCount = 0;
        let graduatedCount = 0;

        for (const studentDoc of studentsSnap.docs) {
            const student = studentDoc.data();
            const studentRef = studentDoc.ref;
            const sId = student.schoolId;

            // Skip if already in the target year (idempotency)
            if (student.academicYear === newYearLabel) continue;

            // Skip inactive/alumni unless we want to bring them back? No.
            if (student.status === "ALUMNI" || student.status === "INACTIVE") continue;

            // 1. Calculate Previous Balance
            // We look for the ledger of the current/old year. 
            // If student.academicYear exists, use that. Else use the global currentYear.
            const sourceYear = student.academicYear || currentYear;
            const oldLedgerRef = adminDb.collection("student_fee_ledgers").doc(`${sId}_${sourceYear}`);
            const oldLedgerSnap = await oldLedgerRef.get();

            let pendingBalance = 0;
            // logic to get balance... we might want to be careful not to double count if running multiple times
            if (oldLedgerSnap.exists) {
                const lData = oldLedgerSnap.data();
                // Ensure we handle potential stored strings
                const total = Number(lData?.totalFee || 0);
                const paid = Number(lData?.totalPaid || 0);
                pendingBalance = total - paid;
            }

            // 2. Promotion Logic
            // Default: Active students are promoted. Explicit "DETAINED" students are retained.
            let newClassId = student.classId;
            let newClassName = student.className;
            let newStatus = "ACTIVE"; // The status in the NEW year

            const isDetained = student.status === "DETAINED" || student.promotionStatus === "RETAINED";

            if (!isDetained) {
                // Promote
                const next = getNextClass(student.classId);
                if (next) {
                    newClassId = next.id;
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
            batch.update(studentRef, {
                academicYear: newYearLabel,
                classId: newClassId,
                className: newClassName,
                status: newStatus,
                previousYearStatus: student.status,
                updatedAt: new Date().toISOString()
            });
            ops++;

            // 4. Initialize New Ledger with Balance
            const newLedgerRef = adminDb.collection("student_fee_ledgers").doc(`${sId}_${newYearLabel}`);
            const items = [];
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

            batch.set(newLedgerRef, {
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
            ops++;

            if (ops >= 400) await commitBatch();
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
                stats: { promoted: promotedCount, detained: retainedCount }
            });
        }

        updateData.upcoming = FieldValue.arrayRemove(newYearLabel);
        batch.set(configRef, updateData, { merge: true });
        ops++;

        await commitBatch();

        return NextResponse.json({
            success: true,
            message: `Transition to ${newYearLabel} Complete.`,
            stats: { promoted: promotedCount, retained: retainedCount }
        });

    } catch (error: any) {
        console.error("Critical Transition Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

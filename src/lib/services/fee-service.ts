import { Firestore, collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from "firebase/firestore";

import { calculateStudentLedger } from "../fees/calculations";

/**
 * Synchronizes the fee ledger for a single student.
 */
export async function syncStudentLedger(db: Firestore, studentId: string, academicYearId: string) {
    const [studentSnap, customFeesSnap, configSnap, classesSnap] = await Promise.all([
        getDoc(doc(db, "students", studentId)),
        getDocs(query(collection(db, "custom_fees"), where("status", "==", "ACTIVE"), where("academicYearId", "==", academicYearId))),
        getDoc(doc(db, "config", "fees")),
        getDocs(query(collection(db, "master_classes")))
    ]);

    if (!studentSnap.exists()) throw new Error("Student not found");

    const student = { id: studentSnap.id, ...studentSnap.data() } as any;
    const activeCustomFees = customFeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const feeConfig = configSnap.exists() ? configSnap.data() : { terms: [], transportFees: {} };

    const classMap = new Map();
    classesSnap.docs.forEach(doc => classMap.set(doc.id, doc.data().name));

    const ledgerId = `${student.schoolId}_${academicYearId}`;
    const ledgerSnap = await getDoc(doc(db, "student_fee_ledgers", ledgerId));

    const updatedLedger = calculateStudentLedger(
        student,
        feeConfig,
        activeCustomFees,
        classMap,
        academicYearId,
        ledgerSnap.exists() ? ledgerSnap.data() : undefined
    );

    await setDoc(doc(db, "student_fee_ledgers", ledgerId), updatedLedger, { merge: true });
    return updatedLedger;
}

export async function syncAllStudentLedgers(db: Firestore, academicYearId?: string) {
    const currentYearId = academicYearId || "2025-2026";

    // 1. Fetch Necessary Data in Parallel
    const [studentsSnap, customFeesSnap, configSnap, classesSnap, ledgersSnap] = await Promise.all([
        getDocs(query(collection(db, "students"), where("status", "==", "ACTIVE"), where("academicYear", "==", currentYearId))),
        getDocs(query(collection(db, "custom_fees"), where("status", "==", "ACTIVE"), where("academicYearId", "==", currentYearId))),
        getDoc(doc(db, "config", "fees")),
        getDocs(query(collection(db, "master_classes"))),
        getDocs(query(collection(db, "student_fee_ledgers"), where("academicYearId", "==", currentYearId)))
    ]);

    const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const activeCustomFees = customFeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const feeConfig = configSnap.exists() ? configSnap.data() : { terms: [], transportFees: {} };

    // Map existing ledgers for O(1) lookup
    const existingLedgersMap = new Map();
    ledgersSnap.docs.forEach(d => existingLedgersMap.set(d.id, d.data()));

    // Map Class ID to Name
    const classMap = new Map();
    classesSnap.docs.forEach(doc => {
        classMap.set(doc.id, doc.data().name);
    });

    let updatedCount = 0;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const student of students) {
        const ledgerId = `${student.schoolId}_${currentYearId}`;
        const existingLedger = existingLedgersMap.get(ledgerId);

        const updatedLedger = calculateStudentLedger(
            student,
            feeConfig,
            activeCustomFees,
            classMap,
            currentYearId,
            existingLedger
        );

        batch.set(doc(db, "student_fee_ledgers", ledgerId), updatedLedger, { merge: true });

        batchCount++;
        updatedCount++;

        if (batchCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    return updatedCount;
}


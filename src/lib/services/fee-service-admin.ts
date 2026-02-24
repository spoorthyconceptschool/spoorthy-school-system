import { adminDb, Timestamp } from "@/lib/firebase-admin";

export async function syncAllStudentLedgersAdmin() {
    // 1. Fetch Necessary Data
    const studentsSnap = await adminDb.collection("students").where("status", "==", "ACTIVE").get();
    const customFeesSnap = await adminDb.collection("custom_fees").where("status", "==", "ACTIVE").get();
    const configSnap = await adminDb.collection("config").doc("fees").get();
    const classesSnap = await adminDb.collection("master_classes").get();
    const ledgersSnap = await adminDb.collection("student_fee_ledgers").get();

    const students = studentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));
    const activeCustomFees = customFeesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));
    const feeConfig = configSnap.exists ? configSnap.data() : { terms: [], transportFees: {} };
    const activeTerms = (feeConfig?.terms || []).filter((t: any) => t.isActive);

    const existingLedgersMap = new Map();
    ledgersSnap.docs.forEach((d: any) => existingLedgersMap.set(d.id, d.data()));

    const classMap = new Map();
    classesSnap.docs.forEach((doc: any) => {
        classMap.set(doc.id, doc.data().name);
    });

    let updatedCount = 0;
    const currentYearId = "2025-2026";

    let batch = adminDb.batch();
    let batchCount = 0;

    for (const student of students) {
        const ledgerId = `${student.schoolId}_${currentYearId}`;
        const ledgerRef = adminDb.collection("student_fee_ledgers").doc(ledgerId);
        const existingLedger = existingLedgersMap.get(ledgerId);

        let existingItems = existingLedger?.items || [];
        let totalPaid = existingLedger?.totalPaid || 0;

        const targetClassId = student.classId;
        const targetClassName = classMap.get(targetClassId) || student.className || "Class 1";

        const newItems: any[] = [];
        const newItemIds = new Set();

        // A. Terms
        activeTerms.forEach((term: any) => {
            const amount = term.amounts?.[targetClassName] || 0;
            if (amount > 0) {
                const itemId = `TERM_${term.id}`;
                newItems.push({
                    id: itemId, type: "TERM", name: term.name, dueDate: term.dueDate,
                    amount: Number(amount), paidAmount: 0, status: "PENDING"
                });
                newItemIds.add(itemId);
            }
        });

        // B. Custom Fees
        activeCustomFees.forEach((cf: any) => {
            let isApplicable = false;
            if (cf.targetType === "CLASS" && cf.targetIds?.includes(targetClassId)) isApplicable = true;
            if (cf.targetType === "VILLAGE" && cf.targetIds?.includes(student.villageId)) isApplicable = true;
            if (cf.targetType === "STUDENT" && cf.targetIds?.includes(student.schoolId)) isApplicable = true;

            if (isApplicable) {
                const itemId = `CUSTOM_${cf.id}`;
                newItems.push({
                    id: itemId, type: "CUSTOM", name: cf.name, dueDate: cf.dueDate,
                    amount: Number(cf.amount), paidAmount: 0, status: "PENDING"
                });
                newItemIds.add(itemId);
            }
        });

        // C. Transport Fee
        const transportFeeAmount = (student.transportRequired && student.villageId) ? feeConfig?.transportFees?.[student.villageId] : 0;
        if (transportFeeAmount > 0) {
            const itemId = `TRANSPORT_FEE`;
            newItems.push({
                id: itemId, type: "TRANSPORT", name: "Transport Fee",
                dueDate: `${currentYearId.split('-')[0]}-06-01`, amount: Number(transportFeeAmount), paidAmount: 0, status: "PENDING"
            });
            newItemIds.add(itemId);
        }

        // D. Merge Logic
        let mergedItems = existingItems.filter((item: any) => {
            if (item.paidAmount > 0) return true;
            return newItemIds.has(item.id);
        });

        newItems.forEach(newItem => {
            const existingIndex = mergedItems.findIndex((i: any) => i.id === newItem.id);
            if (existingIndex === -1) {
                mergedItems.push(newItem);
            } else {
                const ex = mergedItems[existingIndex];
                if (ex.paidAmount === 0) {
                    mergedItems[existingIndex] = { ...ex, amount: newItem.amount, dueDate: newItem.dueDate, name: newItem.name };
                } else {
                    mergedItems[existingIndex] = { ...ex, dueDate: newItem.dueDate, name: newItem.name };
                }
            }
        });

        const totalFee = mergedItems.reduce((sum: number, i: any) => sum + i.amount, 0);

        batch.set(ledgerRef, {
            studentId: student.schoolId,
            studentName: student.studentName || "Unknown",
            parentName: student.parentName || "",
            parentMobile: student.parentMobile || student.mobile || "",
            villageName: student.villageName || "",
            villageId: student.villageId || "",
            academicYearId: currentYearId,
            classId: student.classId || "",
            className: student.className || "",
            sectionName: student.sectionName || "",
            totalFee,
            totalPaid,
            status: totalPaid >= totalFee ? "PAID" : "PENDING",
            items: mergedItems,
            updatedAt: Timestamp.now()
        }, { merge: true });

        batchCount++;
        updatedCount++;

        if (batchCount >= 400) {
            await batch.commit();
            batch = adminDb.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    return updatedCount;
}


/**
 * PURE LOGIC: Calculates the fee ledger for a student based on provided data.
 * This function does NOT perform any I/O and can be used on both Client and Server.
 */
export function calculateStudentLedger(
    student: {
        schoolId: string;
        studentName: string;
        parentName?: string;
        parentMobile?: string;
        mobile?: string;
        villageId?: string;
        villageName?: string;
        classId: string;
        className?: string;
        sectionName?: string;
        transportRequired?: boolean;
    },
    feeConfig: {
        terms?: Array<{
            id: string;
            name: string;
            dueDate: string;
            isActive: boolean;
            amounts: Record<string, number>;
        }>;
        transportFees?: Record<string, number>;
    },
    activeCustomFees: Array<{
        id: string;
        name: string;
        dueDate: string;
        amount: number;
        targetType: "CLASS" | "VILLAGE" | "STUDENT";
        targetIds: string[];
    }>,
    classMap: Map<string, string>,
    currentYearId: string,
    existingLedger?: {
        items?: any[];
        totalPaid?: number;
    }
) {
    let existingItems = existingLedger?.items || [];
    let totalPaid = existingLedger?.totalPaid || 0;

    const targetClassId = student.classId;
    const targetClassName = classMap.get(targetClassId) || student.className || "Class 1";

    const newItems: any[] = [];
    const newItemIds = new Set();

    // A. Terms
    const activeTerms = (feeConfig?.terms || []).filter((t: any) => t.isActive);
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
        if (cf.targetType === "VILLAGE" && cf.targetIds?.includes(student.villageId || "")) isApplicable = true;
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
    const transportFeeAmount = (student.transportRequired && student.villageId) ? (feeConfig?.transportFees?.[student.villageId] || 0) : 0;
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

    return {
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
        status: totalPaid >= totalFee ? "PAID" : (totalPaid > 0 ? "PARTIAL" : "PENDING"),
        items: mergedItems,
        updatedAt: new Date().toISOString()
    };
}

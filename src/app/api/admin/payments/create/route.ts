import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const callerUid = decodedToken.uid;

        // Fetch users/{uid} to get role and schoolId
        const userDoc = await adminDb.collection("users").doc(callerUid).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const callerRole = userData?.role || decodedToken.role || "";
        const callerSchoolId = userData?.schoolId || "";

        const body = await request.json();
        const { studentId, studentName, amount, method, date, remarks, adminId, currentYearId: passedYear } = body;

        let finalRemarks = remarks || "";
        if (callerRole === "MANAGER" || callerRole === "manager") {
            const managerGlow = ` [Collected by Manager: ${callerSchoolId || decodedToken.email}]`;
            finalRemarks = finalRemarks ? `${finalRemarks}${managerGlow}` : managerGlow.trim();
        }

        if (!studentId || !amount || amount <= 0) {
            return NextResponse.json({ success: false, error: "Invalid payment details" }, { status: 400 });
        }

        const currentYearId = passedYear || "2025-2026";
        const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${studentId}_${currentYearId}`);
        const studentRef = adminDb.collection("students").doc(studentId);

        // Run as a transaction to ensure atomic updates
        const { paymentId, schoolId, branchId } = await adminDb.runTransaction(async (transaction: any) => {
            const ledgerDoc = await transaction.get(ledgerRef);
            const studentDoc = await transaction.get(studentRef);

            const studentData = studentDoc.exists ? studentDoc.data() : null;
            // Fetch Ledger data safely
            // Note: studentData.schoolId is often the admission number, so we must use branchId for tenant isolation
            const branchId = studentData?.branchId || callerSchoolId;
            const schoolId = studentData?.branchId || callerSchoolId; // fallback to branchId because studentData.schoolId is admission number!
            let totalFee = 0;
            let totalPaid = 0;

            if (ledgerDoc.exists) {
                const data = ledgerDoc.data();
                totalFee = data?.totalFee || 0;
                totalPaid = data?.totalPaid || 0;
            }

            const newTotalPaid = totalPaid + Number(amount);
            const newStatus = newTotalPaid >= totalFee ? "PAID" : "PENDING";

            if (ledgerDoc.exists) {
                // Update existing ledger
                transaction.update(ledgerRef, {
                    totalPaid: newTotalPaid,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                    schoolId,
                    branchId
                });
            } else {
                // Should practically never happen, but handle missing ledgers gracefully
                transaction.set(ledgerRef, {
                    studentId,
                    studentName,
                    totalFee: 0,
                    totalPaid: newTotalPaid,
                    status: newStatus,
                    academicYearId: currentYearId,
                    updatedAt: new Date().toISOString(),
                    schoolId,
                    branchId
                });
            }

            // Record Payment
            const paymentRef = adminDb.collection("payments").doc();
            transaction.set(paymentRef, {
                studentId,
                studentName,
                amount: Number(amount),
                method,
                date: new Date(date),
                status: "success",
                remarks: finalRemarks,
                createdAt: new Date(),
                verifiedBy: (callerRole === "MANAGER" || callerRole === "manager") ? `manager:${callerSchoolId || decodedToken.email}` : (adminId || "admin"),
                type: "credit",
                academicYear: currentYearId,
                schoolId,
                branchId
            });

            // Notify Student (if UID exists)
            if (studentDoc.exists && studentData?.uid) {
                const studentUid = studentData.uid;
                const notificationRef = adminDb.collection("notifications").doc();
                transaction.set(notificationRef, {
                    userId: studentUid,
                    title: "Fee Payment Received",
                    message: `Payment of ₹${Number(amount).toLocaleString()} received via ${method}. ${remarks ? `(${remarks})` : ''}`,
                    type: "PAYMENT_RECEIVED",
                    status: "UNREAD",
                    createdAt: new Date(),
                    read: false,
                    schoolId,
                    branchId
                });
            }

            // Notify Admins
            const adminNotifRef = adminDb.collection("notifications").doc();
            transaction.set(adminNotifRef, {
                target: "ALL_ADMINS",
                title: "Fee Collected",
                message: `Collected ₹${Number(amount).toLocaleString()} from ${studentName} (${studentId}) via ${method}.`,
                type: "PAYMENT_COLLECTED",
                status: "UNREAD",
                createdAt: new Date(),
                read: false,
                schoolId,
                branchId
            });

            return { paymentId: paymentRef.id, schoolId, branchId };
        });

        return NextResponse.json({ 
            success: true, 
            message: "Payment recorded successfully",
            payment: {
                id: paymentId,
                studentId,
                studentName,
                amount: Number(amount),
                method,
                date: new Date(date).toISOString(),
                status: "success",
                remarks: finalRemarks,
                type: "credit",
                academicYear: currentYearId,
                schoolId,
                branchId
            }
        });
    } catch (e: any) {
        console.error("Payment API Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

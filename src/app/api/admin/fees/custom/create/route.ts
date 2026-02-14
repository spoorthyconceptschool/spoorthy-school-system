import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue, QueryDocumentSnapshot, DocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { notifyManagerActionServer, createServerNotification } from "@/lib/notifications-server";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Fetch actor role
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const actorRole = userDoc.data()?.role || decodedToken.role || "UNKNOWN";
        const actorName = userDoc.data()?.name || decodedToken.name || "Manager";

        if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(actorRole.toUpperCase()) && !decodedToken.email?.includes("admin")) {
            console.warn(`[Admin Custom Fee Create] Forbidden access attempt by ${decodedToken.email} (${actorRole})`);
            return NextResponse.json({ error: "Insufficient Permissions" }, { status: 403 });
        }

        // 2. Parse Payload
        const body = await req.json();
        const {
            name,
            amount,
            dueDate,
            targetType, // "CLASS" | "VILLAGE"
            targetIds, // Array of Class IDs or Village IDs
            yearId = "2025-2026"
        } = body;

        if (!name || !amount || !dueDate || !targetType || !targetIds || targetIds.length === 0) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        // 3. Create Custom Fee Definition
        const feeId = adminDb.collection("custom_fees").doc().id;
        const feeData = {
            id: feeId,
            name,
            amount: Number(amount),
            dueDate,
            targetType,
            targetIds,
            academicYearId: yearId,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: decodedToken.uid || "ADMIN"
        };

        // 4. Identify Target Students
        let studentQuery;
        const studentsRef = adminDb.collection("students");

        // Note: active students only
        if (targetType === "CLASS") {
            studentQuery = studentsRef.where("classId", "in", targetIds);
        } else if (targetType === "VILLAGE") {
            studentQuery = studentsRef.where("villageId", "in", targetIds);
        } else {
            return NextResponse.json({ error: "Invalid Target Type" }, { status: 400 });
        }

        const studentsSnap = await studentQuery.where("status", "==", "ACTIVE").get();

        if (studentsSnap.empty) {
            // Save definition but no students affected
            await adminDb.collection("custom_fees").doc(feeId).set(feeData);
            return NextResponse.json({
                success: true,
                message: "Custom Fee created. No active students found matching criteria.",
                affectedCount: 0
            });
        }

        // 5. Batch Update Ledgers
        const docs = studentsSnap.docs;

        // Save Fee Definition First
        await adminDb.collection("custom_fees").doc(feeId).set(feeData);

        let affectedCount = 0;

        // FUNCTION to process a student
        const processStudent = async (studentDoc: QueryDocumentSnapshot) => {
            const sData = studentDoc.data();
            const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${sData.schoolId}_${yearId}`);

            await adminDb.runTransaction(async (t: any) => {
                const ledDoc = (await t.get(ledgerRef)) as unknown as DocumentSnapshot; // Explicit Cast Force
                if (!ledDoc.exists) return;

                const data = ledDoc.data();
                const items = data?.items || [];

                // Check if already applied
                if (items.some((i: any) => i.id === `CUSTOM_${feeId}`)) return;

                const newItem = {
                    id: `CUSTOM_${feeId}`,
                    type: "CUSTOM",
                    name: name,
                    dueDate: dueDate,
                    amount: Number(amount),
                    paidAmount: 0,
                    status: "PENDING"
                };

                const newItems = [...items, newItem];
                const newTotal = (data?.totalFee || 0) + Number(amount);
                const status = newTotal > (data?.totalPaid || 0) ? "PENDING" : "PAID";

                t.update(ledgerRef, {
                    items: newItems,
                    totalFee: newTotal,
                    status: status,
                    updatedAt: FieldValue.serverTimestamp()
                });
            });
            return true;
        };

        // Execution with Concurrency Limit 
        const CONCURRENCY = 10;
        for (let i = 0; i < docs.length; i += CONCURRENCY) {
            const batchDocs = docs.slice(i, i + CONCURRENCY);
            await Promise.all(batchDocs.map((d: any) => processStudent(d)));
            affectedCount += batchDocs.length;
        }

        // Audit Log
        await adminDb.collection("audit_logs").add({
            action: "CREATE_CUSTOM_FEE",
            actorUid: decodedToken.uid || "ADMIN",
            details: { name, amount, targetType, affectedCount },
            timestamp: FieldValue.serverTimestamp()
        });

        // Notification for Group (Affected Students)
        const targetPrefix = targetType === "CLASS" ? "class_" : "village_";
        await Promise.all(targetIds.map((tid: string) => createServerNotification({
            target: `${targetPrefix}${tid}`,
            title: "New Fee Assigned",
            message: `A new fee "${name}" (₹${Number(amount).toLocaleString()}) has been assigned to your ${targetType.toLowerCase()}.`,
            type: "FEE"
        })));

        // Notification for Manager Action
        if (actorRole === "MANAGER") {
            await notifyManagerActionServer({
                title: "Custom Fee Created",
                message: `A new custom fee "${name}" (₹${Number(amount).toLocaleString()}) has been created & assigned to ${affectedCount} students in ${targetIds.length} ${targetType.toLowerCase()}(s) by Manager ${actorName}.`,
                type: "FEE",
                actionBy: decodedToken.uid,
                actionByName: actorName
            });
        }

        return NextResponse.json({
            success: true,
            message: `Custom Fee assigned to ${affectedCount} students.`,
            feeId
        });

    } catch (error: any) {
        console.error("Custom Fee Creation Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

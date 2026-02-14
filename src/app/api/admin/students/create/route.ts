import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyManagerActionServer } from "@/lib/notifications-server";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Admin Token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Detailed Role Check
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const actorRole = userDoc.data()?.role || decodedToken.role || "UNKNOWN";
        const actorName = userDoc.data()?.name || decodedToken.name || "Manager";

        const hasAdminRole = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(actorRole.toUpperCase());
        const hasAdminEmail = decodedToken.email?.includes("admin") || decodedToken.email?.endsWith("@spoorthy.edu");

        if (!hasAdminRole && !hasAdminEmail) {
            console.warn(`[Admin Create Student] Forbidden access attempt by ${decodedToken.email} (${actorRole})`);
            return NextResponse.json({ error: "Insufficient Permissions" }, { status: 403 });
        }

        // 2. Parse & Validate Payload
        const body = await req.json();
        const {
            studentName,
            parentName,
            parentMobile,
            villageId,
            classId,
            sectionId,
            villageName, // derived/passed from frontend for easier display
            className,
            sectionName
        } = body;

        if (!studentName || !parentName || !parentMobile || !villageId || !classId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!/^\d{10}$/.test(parentMobile)) {
            return NextResponse.json({ error: "Invalid mobile number. Must be 10 digits." }, { status: 400 });
        }

        // 3. Atomic Transaction for ID Generation & User Creation
        const result = await adminDb.runTransaction(async (transaction: any) => {
            // A. Counter Increment
            const counterRef = adminDb.collection("counters").doc("students");
            const counterSnap = await transaction.get(counterRef);

            let nextIdNum = 1;
            if (counterSnap.exists) {
                nextIdNum = counterSnap.data()?.current + 1;
            }

            // B. Format School ID
            const schoolId = `SHS${String(nextIdNum).padStart(5, "0")}`;

            // C. Create Auth User (Synthetic Email)
            // Note: We cannot create Auth user *inside* the transaction strictly speaking, 
            // but we can prepare it. If auth creation fails, the transaction aborts (implicitly or explicitly).
            // However, Firestore transactions are for DB only. 
            // Better pattern: Create Auth User first? No, gaps in ID.
            // Better pattern: Do it blindly?
            // "Atomic" Requirement: Best effort. 
            // We will do Auth Create *outside* but if it fails we fail the request.
            // ACTUALLY: To guarantee ID sequence, we must Reserve the ID first in the transaction.

            // Let's modify approach:
            // 1. Transaction: Increment counter, Reserve 'SHS00001' in a 'reserved_ids' or just return it.
            // 2. Create Auth.
            // 3. Write Data.
            // If 2 or 3 fail, the ID is "burned" (skipped). This is standard for high-scale systems.
            // The requirement says "Sequential". Skipping is usually acceptable but let's try to be robust.

            // Re-read Requirement: "ID generation must be atomic... server-side"

            // Doing it all in one flow (Auth creation is not transaction-able with Firestore).
            // We will Increment + Write to DB in transaction.

            transaction.set(counterRef, { current: nextIdNum }, { merge: true });

            const studentRef = adminDb.collection("students").doc(schoolId);
            const userSchoolIdRef = adminDb.collection("usersBySchoolId").doc(schoolId);

            // We need the UID to write to /users/{uid}, so Auth creation MUST happen before or during.
            // We can't do await auth.createUser inside transaction block easily if we want to rollback Firestore on Auth fail.
            // BUT, we can't rollback Auth on Firestore fail.

            // SAFE STRATEGY: 
            // 1. Transaction: Get & Increment Counter. Return `schoolId`.
            // 2. Create Auth User.
            // 3. Write Student Data + Link User.
            // If 2 fails, we have a gap. That's life.
            // If 3 fails, we allow retry or manual fix.

            return { nextIdNum, schoolId };
        });

        const { schoolId } = result;
        const syntheticEmail = `${schoolId}@school.local`.toLowerCase();
        const initialPassword = parentMobile; // As per requirement

        let uid;
        try {
            const userRecord = await adminAuth.createUser({
                email: syntheticEmail,
                password: initialPassword,
                displayName: studentName,
                disabled: false
            });
            uid = userRecord.uid;
        } catch (authError: any) {
            console.error("Auth Creation Failed:", authError);
            // Rollback strategy would be complex here.
            // For now, return 500. The ID counter is already incremented (burned ID).
            return NextResponse.json({
                error: "Failed to create login credentials. ID was reserved but user creation failed.",
                details: authError.message
            }, { status: 500 });
        }

        // 4. Write Detailed Data (Now that we have UID)
        // We can do this in a batch or another transaction.
        const batch = adminDb.batch();

        // A. /users/{uid} (Role Mapping)
        batch.set(adminDb.collection("users").doc(uid), {
            schoolId: schoolId,
            role: "STUDENT",
            status: "ACTIVE",
            createdAt: FieldValue.serverTimestamp(),
            mustChangePassword: true, // Force password change
            linkedProfileId: schoolId
        });

        // B. /usersBySchoolId/{schoolId} (Reverse Lookup)
        batch.set(adminDb.collection("usersBySchoolId").doc(schoolId), {
            uid: uid,
            role: "STUDENT"
        });

        // C. /students/{schoolId} (Profile Data)
        batch.set(adminDb.collection("students").doc(schoolId), {
            schoolId,
            uid,
            studentName,
            parentName,
            parentMobile,
            villageId,
            villageName: villageName || "",
            classId,
            className: className || "",
            sectionId,
            sectionName: sectionName || "",
            transportRequired: body.transportRequired || false,
            status: "ACTIVE",
            createdAt: FieldValue.serverTimestamp(),
            createdBy: decodedToken.uid || "ADMIN",
            email: syntheticEmail, // Internal only
            recoveryPassword: initialPassword // Shadow Password for Admin Visibility
        });

        // D. Create Fee Ledger (Mandatory Addendum 13.1)
        // ---------------------------------------------------------
        // 1. Fetch Fee Configuration
        const feeConfigSnap = await adminDb.collection("config").doc("fees").get();
        const feeConfig = feeConfigSnap.data();
        const feeTerms = (feeConfig?.terms || []).filter((t: any) => t.isActive);

        // 2. Fetch Custom Fees (Future Proofing)
        // Assuming 'custom_fees' collection for class-targeted fees
        const customFeesSnap = await adminDb.collection("custom_fees")
            .where("targetClassId", "==", classId)
            .where("isActive", "==", true)
            .get();

        const currentYearId = "2025-2026";
        const ledgerItems: any[] = [];
        let totalFee = 0;

        // 3. Process Term Fees
        const targetClassKey = className || "Class 1"; // Fallback to avoid crash

        feeTerms.forEach((term: any) => {
            const amount = term.amounts?.[targetClassKey] || 0;
            if (amount > 0) {
                ledgerItems.push({
                    id: `TERM_${term.id}`,
                    type: "TERM",
                    name: term.name,
                    dueDate: term.dueDate, // String YYYY-MM-DD
                    amount: Number(amount),
                    paidAmount: 0,
                    status: "PENDING"
                });
                totalFee += Number(amount);
            }
        });

        // 3.1 Process Transport Fee (If requested)
        if (body.transportRequired && feeConfig?.transportFees?.[villageId]) {
            const tAmount = feeConfig.transportFees[villageId];
            if (tAmount > 0) {
                ledgerItems.push({
                    id: `TRANSPORT_FEE`,
                    type: "TRANSPORT",
                    name: "Transport Fee",
                    dueDate: `${currentYearId.split('-')[0]}-06-01`,
                    amount: Number(tAmount),
                    paidAmount: 0,
                    status: "PENDING"
                });
                totalFee += Number(tAmount);
            }
        }

        // 4. Process Custom Fees
        customFeesSnap.forEach((doc: any) => {
            const data = doc.data();
            ledgerItems.push({
                id: `CUSTOM_${doc.id}`,
                type: "CUSTOM",
                name: data.name,
                dueDate: data.dueDate || new Date().toISOString().split('T')[0],
                amount: Number(data.amount),
                paidAmount: 0,
                status: "PENDING"
            });
            totalFee += Number(data.amount);
        });

        // 5. Write Ledger Document
        // We use a fixed year 'current' or '2025-2026' for now.
        // In production, fetch current Academic Year ID from config.
        const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${schoolId}_${currentYearId}`);
        batch.set(ledgerRef, {
            studentId: schoolId,
            academicYearId: currentYearId,
            classId: classId,
            className: className,
            totalFee: totalFee,
            totalPaid: 0,
            status: totalFee > 0 ? "PENDING" : "PAID",
            items: ledgerItems,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // E. Audit Log
        const logRef = adminDb.collection("audit_logs").doc();
        batch.set(logRef, {
            action: "CREATE_STUDENT",
            actorUid: decodedToken.uid || "ADMIN",
            targetSchoolId: schoolId,
            details: `Created student ${studentName}`,
            timestamp: FieldValue.serverTimestamp()
        });

        // F. Search Indexing
        const searchKeywords = new Set<string>();
        // Helper to generate keywords (inline to avoid import issues with client SDK)
        const addKeywords = (text: string) => {
            if (!text) return;
            const normalized = text.toLowerCase().trim();
            searchKeywords.add(normalized);
            const tokens = normalized.split(/\s+/);
            tokens.forEach(t => searchKeywords.add(t));
            tokens.forEach(token => {
                for (let i = 2; i <= token.length; i++) {
                    searchKeywords.add(token.substring(0, i));
                }
            });
        };
        addKeywords(studentName);
        addKeywords(schoolId);
        addKeywords(parentMobile);
        addKeywords(className || "");

        const searchRef = adminDb.collection("search_index").doc(schoolId);
        batch.set(searchRef, {
            id: schoolId,
            entityId: schoolId,
            type: "student",
            title: studentName,
            subtitle: `${className} | ${parentMobile}`,
            url: `/admin/students/${schoolId}`,
            keywords: Array.from(searchKeywords),
            updatedAt: FieldValue.serverTimestamp()
        });

        await batch.commit();

        // Notification for Manager Action
        if (actorRole === "MANAGER") {
            await notifyManagerActionServer({
                userId: uid,
                title: "Student Enrolled",
                message: `New student ${studentName} (${schoolId}) has been enrolled by Manager ${actorName}. Class: ${className}`,
                type: "SUCCESS",
                actionBy: decodedToken.uid,
                actionByName: actorName
            });
        }

        return NextResponse.json({
            success: true,
            message: "Student created successfully",
            data: { schoolId, uid, email: syntheticEmail }
        });

    } catch (error: any) {
        console.error("Create Student API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

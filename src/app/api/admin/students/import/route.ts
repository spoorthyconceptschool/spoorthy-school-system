import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Admin Token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Role Check
        const hasAdminRole = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.role === "admin";
        const hasAdminEmail = decodedToken.email?.includes("admin") || decodedToken.email?.endsWith("@spoorthy.edu");

        if (!hasAdminRole && !hasAdminEmail) {
            return NextResponse.json({ error: "Insufficient Permissions" }, { status: 403 });
        }

        const { students } = await req.json();

        if (!students || !Array.isArray(students)) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
        }

        // Limit batch size for safety
        const batchSize = 50;
        const processingBatch = students.slice(0, batchSize);
        console.log(`Processing import batch of ${processingBatch.length} students...`);

        // 1. Fetch Master Data (for mapping IDs to Names)
        const masterSnap = await adminRtdb.ref('master').once('value');
        const masterData = masterSnap.val() || {};
        const classesMap = masterData.classes || {};
        const villagesMap = masterData.villages || {};
        const sectionsMap = masterData.sections || {};

        // 2. Fetch Fee Configuration
        const feeConfigSnap = await adminDb.collection("config").doc("fees").get();
        const feeConfig = feeConfigSnap.data();
        const feeTerms = (feeConfig?.terms || []).filter((t: any) => t.isActive);
        const currentYearId = "2025-2026"; // TODO: Fetch from config

        // 3. Fetch Custom Fees (Optimization: Check if we can fetch all relevant ones)
        // For simplicity in bulk import, we might skip custom fees or fetch all active ones.
        // Let's fetch all active custom fees to map them in memory.
        const customFeesSnap = await adminDb.collection("custom_fees").where("isActive", "==", true).get();
        const customFees = customFeesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
            created: [] as any[]
        };

        // 4. Reserve IDs Block
        // We get a block of IDs equal to batch length to avoid contention.
        let startIdNum = 1;
        await adminDb.runTransaction(async (transaction: any) => {
            const counterRef = adminDb.collection("counters").doc("students");
            const counterSnap = await transaction.get(counterRef);

            if (counterSnap.exists) {
                startIdNum = counterSnap.data()?.current + 1;
            }

            // Reserve N IDs
            transaction.set(counterRef, { current: startIdNum + processingBatch.length - 1 }, { merge: true });
        });

        // 5. Process Each Student
        for (let i = 0; i < processingBatch.length; i++) {
            const student = processingBatch[i];
            const currentIdNum = startIdNum + i;
            const schoolId = `SHS${String(currentIdNum).padStart(5, "0")}`;

            try {
                // Validation
                if (!student.studentName || !student.classId) {
                    throw new Error(`Missing Name or Class ID for row ${i + 1}`);
                }

                // Map Names
                const className = classesMap[student.classId]?.name || student.className || "Unknown Class";
                const villageName = villagesMap[student.villageId]?.name || student.villageName || "Unknown Village";
                const sectionName = sectionsMap[student.sectionId]?.name || student.sectionName || "";

                // Credentials
                const syntheticEmail = `${schoolId}@school.local`.toLowerCase();
                const initialPassword = student.password || student.parentMobile || "welcome123";

                // A. Create Auth User
                let uid = "";
                try {
                    const userRecord = await adminAuth.createUser({
                        email: syntheticEmail,
                        password: String(initialPassword),
                        displayName: student.studentName,
                        disabled: false
                    });
                    uid = userRecord.uid;
                } catch (authError: any) {
                    if (authError.code === 'auth/email-already-exists') {
                        const existingUser = await adminAuth.getUserByEmail(syntheticEmail);
                        uid = existingUser.uid;
                        // Warning: We are overwriting data for an existing schoolId user?
                        // If ID generation is correct, this shouldn't happen unless we reused an ID.
                        console.warn(`User ${syntheticEmail} already exists. Updating...`);
                    } else {
                        throw authError; // Rethrow real errors
                    }
                }

                // B. Prepare DB Writes
                const batch = adminDb.batch();

                // 1. /users/{uid}
                batch.set(adminDb.collection("users").doc(uid), {
                    schoolId: schoolId,
                    email: syntheticEmail,
                    role: "STUDENT",
                    status: "ACTIVE",
                    createdAt: FieldValue.serverTimestamp(),
                    mustChangePassword: true,
                    linkedProfileId: schoolId
                }, { merge: true });

                // 2. /usersBySchoolId/{schoolId}
                batch.set(adminDb.collection("usersBySchoolId").doc(schoolId), {
                    uid: uid,
                    role: "STUDENT"
                });

                // 3. /students/{schoolId}
                batch.set(adminDb.collection("students").doc(schoolId), {
                    ...student,
                    schoolId,
                    uid,
                    studentName: student.studentName,
                    className,
                    classId: student.classId,
                    villageName,
                    villageId: student.villageId || "",
                    sectionName,
                    sectionId: student.sectionId || "",
                    status: "ACTIVE",
                    createdAt: FieldValue.serverTimestamp(),
                    email: syntheticEmail,
                    recoveryPassword: String(initialPassword), // visible to admin
                    transportRequired: !!student.transportRequired
                });

                // 4. Fee Ledger
                let totalFee = 0;
                const ledgerItems: any[] = [];

                // Term Fees
                // Term structure might key by "Class 1" or "classId"?
                // create/route.ts used className. Let's try both or className.
                const targetClassKey = className;
                feeTerms.forEach((term: any) => {
                    const amount = term.amounts?.[targetClassKey] || 0;
                    if (amount > 0) {
                        ledgerItems.push({
                            id: `TERM_${term.id}`,
                            type: "TERM",
                            name: term.name,
                            dueDate: term.dueDate,
                            amount: Number(amount),
                            paidAmount: 0,
                            status: "PENDING"
                        });
                        totalFee += Number(amount);
                    }
                });

                // Transport Fee
                if (student.transportRequired && feeConfig?.transportFees?.[student.villageId]) {
                    const tAmount = feeConfig.transportFees[student.villageId];
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

                // Custom Fees
                const studentCustomFees = customFees.filter((f: any) => f.targetClassId === student.classId);
                studentCustomFees.forEach((f: any) => {
                    ledgerItems.push({
                        id: `CUSTOM_${f.id}`,
                        type: "CUSTOM",
                        name: f.name,
                        dueDate: f.dueDate || new Date().toISOString().split('T')[0],
                        amount: Number(f.amount),
                        paidAmount: 0,
                        status: "PENDING"
                    });
                    totalFee += Number(f.amount);
                });

                // Write Ledger
                const ledgerRef = adminDb.collection("student_fee_ledgers").doc(`${schoolId}_${currentYearId}`);
                batch.set(ledgerRef, {
                    studentId: schoolId,
                    academicYearId: currentYearId,
                    classId: student.classId,
                    className: className,
                    totalFee: totalFee,
                    totalPaid: 0,
                    status: totalFee > 0 ? "PENDING" : "PAID",
                    items: ledgerItems,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });

                // 5. Search Index
                const searchKeywords = new Set<string>();
                const addKeywords = (text: string) => {
                    if (!text) return;
                    const normalized = String(text).toLowerCase().trim();
                    searchKeywords.add(normalized);
                    const tokens = normalized.split(/\s+/);
                    tokens.forEach(t => searchKeywords.add(t));
                    tokens.forEach(token => {
                        for (let i = 2; i <= token.length; i++) {
                            searchKeywords.add(token.substring(0, i));
                        }
                    });
                };
                addKeywords(student.studentName);
                addKeywords(schoolId);
                addKeywords(student.parentMobile);
                addKeywords(className);

                batch.set(adminDb.collection("search_index").doc(schoolId), {
                    id: schoolId,
                    entityId: schoolId,
                    type: "student",
                    title: student.studentName,
                    subtitle: `${className} | ${student.parentMobile}`,
                    url: `/admin/students/${schoolId}`,
                    keywords: Array.from(searchKeywords),
                    updatedAt: FieldValue.serverTimestamp()
                });

                // Commit
                await batch.commit();

                results.success++;
                results.created.push({ schoolId, name: student.studentName });

            } catch (err: any) {
                console.error(`Import Error Row ${i}:`, err);
                results.failed++;
                results.errors.push(`${student.studentName || 'Row ' + (i + 1)}: ${err.message}`);
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Import API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

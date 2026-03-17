import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";

/**
 * ID Prefix Migration API
 * Performs a deep system-wide rename of school identifiers.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication & Role
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        if (decodedToken.role !== "SUPER_ADMIN" && decodedToken.role !== "ADMIN") {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        // 2. Load Decentered Configuration
        const brandingRef = adminDb.collection("settings").doc("branding");
        const brandingSnap = await brandingRef.get();
        if (!brandingSnap.exists) throw new Error("Branding settings not found");

        const { studentIdPrefix, teacherIdPrefix, studentIdSuffix, teacherIdSuffix } = brandingSnap.data() || {};
        if (!studentIdPrefix || !teacherIdPrefix) throw new Error("Prefixes not configured");
        
        const startingStudentSequence = studentIdSuffix ? Number(studentIdSuffix) : 1;
        const startingTeacherSequence = teacherIdSuffix ? Number(teacherIdSuffix) : 1;

        console.log(`[Migration] Starting ID Migration to: Student=${studentIdPrefix}[SEQ], Teacher=${teacherIdPrefix}[SEQ] starting from ${startingStudentSequence} and ${startingTeacherSequence}`);

        const stats = { students: 0, teachers: 0, auth: 0, errors: [] as string[] };
        
        let currentStudentSequence = startingStudentSequence;
        let currentTeacherSequence = startingTeacherSequence;

        // --- MIGRATION: STUDENTS ---
        const studentsSnap = await adminDb.collection("students").get();
        for (const studentDoc of studentsSnap.docs) {
            try {
                const data = studentDoc.data();
                const oldId = studentDoc.id;

                // For full reassignment, we ignore the old sequence and generate a new one
                const numericSequence = String(currentStudentSequence).padStart(5, "0");

                const newId = `${studentIdPrefix}${numericSequence}`;
                if (oldId === newId) {
                    currentStudentSequence++;
                    continue;
                }

                const uid = data.uid;
                const batch = adminDb.batch();

                // A. Clone Student Doc to New ID
                const newStudentRef = adminDb.collection("students").doc(newId);
                const updatedData = {
                    ...data,
                    schoolId: newId,
                    admissionNumber: data.admissionNumber === oldId ? newId : data.admissionNumber,
                    keywords: (data.keywords || []).map((k: string) => k.replace(new RegExp(oldId.toLowerCase(), 'g'), newId.toLowerCase()))
                };
                batch.set(newStudentRef, updatedData);
                batch.delete(studentDoc.ref);

                // B. Update Users Collection
                if (uid) {
                    const userRef = adminDb.collection("users").doc(uid);
                    batch.update(userRef, { schoolId: newId });

                    // C. Update usersBySchoolId
                    batch.delete(adminDb.collection("usersBySchoolId").doc(oldId));
                    batch.set(adminDb.collection("usersBySchoolId").doc(newId), { uid, role: "STUDENT" });

                    // D. Update Auth Email (Atomic check not possible but failures handled)
                    const newEmail = `${newId.toLowerCase()}@school.local`;
                    try {
                        await adminAuth.updateUser(uid, { email: newEmail });
                        stats.auth++;
                    } catch (authErr: any) {
                        if (authErr.code === 'auth/email-already-exists') {
                            const zombie = await adminAuth.getUserByEmail(newEmail);
                            if (zombie && zombie.uid !== uid) {
                                await adminAuth.deleteUser(zombie.uid);
                                await adminAuth.updateUser(uid, { email: newEmail });
                                stats.auth++;
                            }
                        } else {
                            throw authErr;
                        }
                    }
                }

                // E. Migrate Fee Ledgers
                const ledgerSnap = await adminDb.collection("student_fee_ledgers")
                    .where("schoolId", "==", oldId).get();
                for (const ledgerDoc of ledgerSnap.docs) {
                    const lData = ledgerDoc.data();
                    const oldLedgerId = ledgerDoc.id;
                    const newLedgerId = oldLedgerId.replace(oldId, newId);
                    batch.set(adminDb.collection("student_fee_ledgers").doc(newLedgerId), {
                        ...lData,
                        schoolId: newId
                    });
                    batch.delete(ledgerDoc.ref);
                }

                // F. Update search_index
                const studentSearchRef = adminDb.collection("search_index").doc(oldId);
                const studentSearchSnap = await studentSearchRef.get();
                if (studentSearchSnap.exists) {
                    const sData = studentSearchSnap.data();
                    batch.delete(studentSearchRef);
                    batch.set(adminDb.collection("search_index").doc(newId), {
                        ...sData,
                        id: newId,
                        entityId: newId,
                        keywords: (sData?.keywords || []).map((k: string) => k.replace(oldId.toLowerCase(), newId.toLowerCase())),
                        url: `/admin/students/${newId}`
                    });
                }

                await batch.commit();
                stats.students++;
                currentStudentSequence++;
            } catch (err: any) {
                console.error(`[Migration] Student ${studentDoc.id} failed:`, err.message);
                stats.errors.push(`Student ${studentDoc.id}: ${err.message}`);
            }
        }

        // --- MIGRATION: TEACHERS ---
        const teachersSnap = await adminDb.collection("teachers").get();
        for (const teacherDoc of teachersSnap.docs) {
            try {
                const data = teacherDoc.data();
                const oldId = teacherDoc.id;

                // For full reassignment, we ignore the old sequence and generate a new one
                const numericPart = String(currentTeacherSequence).padStart(4, "0");

                const newId = `${teacherIdPrefix}${numericPart}`;
                if (oldId === newId) {
                    currentTeacherSequence++;
                    continue;
                }

                const uid = data.uid;
                const batch = adminDb.batch();

                // A. Clone Teacher Doc
                const newTeacherRef = adminDb.collection("teachers").doc(newId);
                const updatedData = {
                    ...data,
                    schoolId: newId,
                };
                batch.set(newTeacherRef, updatedData);
                batch.delete(teacherDoc.ref);

                // B. Update mappings
                if (uid) {
                    batch.update(adminDb.collection("users").doc(uid), { schoolId: newId });
                    batch.delete(adminDb.collection("usersBySchoolId").doc(oldId));
                    batch.set(adminDb.collection("usersBySchoolId").doc(newId), { uid, role: "TEACHER" });

                    const newEmail = `${newId.toLowerCase()}@school.local`;
                    try {
                        await adminAuth.updateUser(uid, { email: newEmail });
                        stats.auth++;
                    } catch (authErr: any) {
                        if (authErr.code === 'auth/email-already-exists') {
                            const zombie = await adminAuth.getUserByEmail(newEmail);
                            if (zombie && zombie.uid !== uid) {
                                await adminAuth.deleteUser(zombie.uid);
                                await adminAuth.updateUser(uid, { email: newEmail });
                                stats.auth++;
                            }
                        } else {
                            throw authErr;
                        }
                    }
                }

                // C. Update search_index (if exists)
                const searchRef = adminDb.collection("search_index").doc(oldId);
                const searchSnap = await searchRef.get();
                if (searchSnap.exists) {
                    const sData = searchSnap.data();
                    batch.delete(searchRef);
                    batch.set(adminDb.collection("search_index").doc(newId), {
                        ...sData,
                        id: newId,
                        entityId: newId,
                        keywords: (sData?.keywords || []).map((k: string) => k.replace(oldId.toLowerCase(), newId.toLowerCase()))
                    });
                }

                await batch.commit();
                stats.teachers++;
                currentTeacherSequence++;
            } catch (err: any) {
                console.error(`[Migration] Teacher ${teacherDoc.id} failed:`, err.message);
                stats.errors.push(`Teacher ${teacherDoc.id}: ${err.message}`);
            }
        }

        // --- UPDATE COUNTERS ---
        // After migration, we need to ensure the counters are updated to the latest sequence
        // so that the next created student/teacher gets the right ID.
        const countersBatch = adminDb.batch();
        countersBatch.set(adminDb.collection("counters").doc("students_global"), { current: currentStudentSequence - 1 }, { merge: true });
        countersBatch.set(adminDb.collection("counters").doc("teachers"), { count: currentTeacherSequence - 1 }, { merge: true });
        await countersBatch.commit();

        return NextResponse.json({
            success: true,
            message: "Migration completed",
            stats
        });

    } catch (error: any) {
        console.error("[Migration API] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

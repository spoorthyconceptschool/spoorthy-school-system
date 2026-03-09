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

        const { studentIdPrefix, teacherIdPrefix } = brandingSnap.data() || {};
        if (!studentIdPrefix || !teacherIdPrefix) throw new Error("Prefixes not configured");

        console.log(`[Migration] Starting ID Migration to: Student=${studentIdPrefix}, Teacher=${teacherIdPrefix}`);

        const stats = { students: 0, teachers: 0, auth: 0, errors: [] as string[] };

        // --- MIGRATION: STUDENTS ---
        const studentsSnap = await adminDb.collection("students").get();
        for (const studentDoc of studentsSnap.docs) {
            try {
                const data = studentDoc.data();
                const oldId = studentDoc.id;

                // Only migrate if prefix differs (assuming Prefix-Year-Seq format)
                if (!oldId.includes("-")) continue;
                const newId = `${studentIdPrefix}-${oldId.split("-").slice(1).join("-")}`;
                if (oldId === newId) continue;

                const uid = data.uid;
                const batch = adminDb.batch();

                // A. Clone Student Doc to New ID
                const newStudentRef = adminDb.collection("students").doc(newId);
                const updatedData = {
                    ...data,
                    schoolId: newId,
                    admissionNumber: data.admissionNumber === oldId ? newId : data.admissionNumber,
                    keywords: (data.keywords || []).map((k: string) =>
                        k.toLowerCase().startsWith(oldId.split("-")[0].toLowerCase())
                            ? k.replace(new RegExp(`^${oldId.split("-")[0]}`, 'i'), studentIdPrefix)
                            : k
                    )
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
                    await adminAuth.updateUser(uid, { email: newEmail });
                    stats.auth++;
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

                await batch.commit();
                stats.students++;
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

                // Extract numeric part (Assuming prefix followed by digits)
                const numericPart = oldId.match(/\d+$/)?.[0];
                if (!numericPart) continue;

                const newId = `${teacherIdPrefix}${numericPart}`;
                if (oldId === newId) continue;

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

                    await adminAuth.updateUser(uid, { email: `${newId.toLowerCase()}@school.local` });
                    stats.auth++;
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
            } catch (err: any) {
                console.error(`[Migration] Teacher ${teacherDoc.id} failed:`, err.message);
                stats.errors.push(`Teacher ${teacherDoc.id}: ${err.message}`);
            }
        }

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

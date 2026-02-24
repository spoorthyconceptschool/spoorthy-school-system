import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth, adminRtdb, getInitError, FieldValue, ServerValue } from "@/lib/firebase-admin";

/**
 * REFACTORED ADMISSION API
 * Uses the shared lib/firebase-admin to avoid singleton confusion.
 * Includes improved production error reporting.
 */

export async function GET() {
    try {
        const initErr = getInitError();
        if (initErr) {
            return NextResponse.json({
                status: "CRITICAL",
                message: "Initialization Failed",
                error: initErr
            }, { status: 500 });
        }

        // Test connectivity
        const testSnap = await adminDb.collection("counters").doc("students").get();
        return NextResponse.json({
            status: "ONLINE",
            message: "Modular Engine is VERIFIED.",
            current_id: testSnap.data()?.current || 0
        });
    } catch (e: any) {
        return NextResponse.json({
            status: "ERROR",
            message: `Shared Engine Failure: ${e.message}`,
            init_error: getInitError()
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // 1. Authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { studentName, parentMobile, classId } = body;

        if (!studentName || !parentMobile || !classId) {
            return NextResponse.json({ error: "Missing Name, Mobile or Class" }, { status: 400 });
        }

        // 2. ID Generation
        const counterRef = adminDb.collection("counters").doc("students");
        const counterDoc = await counterRef.get();
        const nextIdNum = (counterDoc.data()?.current || 0) + 1;
        await counterRef.set({ current: nextIdNum }, { merge: true });

        const schoolId = `SHS${String(nextIdNum).padStart(5, "0")}`;
        const syntheticEmail = `${schoolId}@school.local`.toLowerCase();

        // 3. Create Auth Account
        const userRecord = await adminAuth.createUser({
            email: syntheticEmail,
            password: parentMobile,
            displayName: studentName
        });
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: "STUDENT" });

        const record = {
            ...body,
            schoolId,
            uid: userRecord.uid,
            role: "STUDENT",
            status: "ACTIVE",
            academicYear: body.academicYear || "2025-2026"
        };

        // 4. Multi-Database Write
        // A. Firestore Write (with FieldValue)
        const firestoreRecord = {
            ...record,
            createdAt: FieldValue.serverTimestamp(),
            admissionDate: new Date().toISOString()
        };
        await adminDb.collection("students").doc(schoolId).set(firestoreRecord);

        await adminDb.collection("users").doc(userRecord.uid).set({
            schoolId, role: "STUDENT", status: "ACTIVE", email: syntheticEmail
        });

        // B. RTDB Write (with ServerValue)
        try {
            await adminRtdb.ref(`students/${schoolId}`).set({
                ...record,
                createdAt: ServerValue ? ServerValue.TIMESTAMP : new Date().getTime(),
                admissionDate: new Date().toISOString()
            });
        } catch (rtdbErr) {
            console.warn("[Admission] RTDB write warning:", rtdbErr);
        }

        // Initial Ledger
        const ledgerYear = body.academicYear || "2025-2026";
        await adminDb.collection("student_fee_ledgers").doc(`${schoolId}_${ledgerYear}`).set({
            studentId: schoolId, academicYear: ledgerYear, items: [], totalPaid: 0, updatedAt: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            data: { schoolId }
        });

    } catch (error: any) {
        console.error("[Admission] Final Engine Error:", error);
        return NextResponse.json({
            success: false,
            error: `Admission Failed: ${error.message}`,
            init_error: getInitError(),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

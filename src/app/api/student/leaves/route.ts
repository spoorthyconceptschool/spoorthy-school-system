import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        const body = await req.json();
        const { dates, fromDate, toDate, type, reason, studentName, classId, sectionId } = body;

        let effectiveFrom = fromDate;
        let effectiveTo = toDate;
        let effectiveDates = dates;

        // If dates array is provided, it takes precedence for determining range
        if (dates && Array.isArray(dates) && dates.length > 0) {
            const sortedDates = [...dates].sort();
            effectiveFrom = sortedDates[0];
            effectiveTo = sortedDates[sortedDates.length - 1];
            effectiveDates = sortedDates;
        }

        if (!effectiveFrom || !effectiveTo || !type || !reason || !classId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const schoolId = decodedToken.email?.split('@')[0].toUpperCase();
        if (!schoolId) throw new Error("Invalid Student ID");

        const leaveRef = adminDb.collection("student_leaves").doc();
        await leaveRef.set({
            studentId: schoolId,
            studentName,
            classId,
            sectionId,
            dates: effectiveDates || [],
            fromDate: effectiveFrom,
            toDate: effectiveTo,
            type,
            reason,
            status: "PENDING", // PENDING, APPROVED, REJECTED
            createdAt: FieldValue.serverTimestamp(),
            uid: decodedToken.uid
        });

        return NextResponse.json({ success: true, message: "Leave request submitted successfully" });
    } catch (error: any) {
        console.error("Apply Leave Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        const schoolId = decodedToken.email?.split('@')[0].toUpperCase();
        if (!schoolId) throw new Error("Invalid Student ID");

        const snap = await adminDb.collection("student_leaves")
            .where("studentId", "==", schoolId)
            // .orderBy("createdAt", "desc") // Removed to avoid index requirement
            .limit(20)
            .get();

        const data = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        // Manual Sort
        data.sort((a: any, b: any) => {
            const timeA = a.createdAt?._seconds || 0;
            const timeB = b.createdAt?._seconds || 0;
            return timeB - timeA;
        });

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

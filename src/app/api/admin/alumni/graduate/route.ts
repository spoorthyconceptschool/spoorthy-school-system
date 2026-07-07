import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        const { classId, academicYear, branchId } = await request.json();

        if (!classId || !academicYear) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let query = adminDb.collection("students")
            .where("classId", "==", classId)
            .where("status", "==", "ACTIVE");

        if (branchId && branchId !== "global") {
            query = query.where("schoolId", "==", branchId);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return NextResponse.json({ count: 0, message: "No active students found in this class." });
        }

        const batch = adminDb.batch();
        let count = 0;

        snapshot.forEach((doc: any) => {
            batch.update(doc.ref, {
                status: "ALUMNI",
                alumniYear: academicYear,
                updatedAt: new Date().toISOString()
            });
            count++;
        });

        await batch.commit();

        return NextResponse.json({ success: true, count });
    } catch (error: any) {
        console.error("Error graduating students:", error);
        return NextResponse.json({ error: error.message || "Failed to graduate students" }, { status: 500 });
    }
}

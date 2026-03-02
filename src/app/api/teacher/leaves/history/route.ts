import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Fetch without orderBy to avoid index requirement
        const snap = await adminDb.collection("leave_requests")
            .where("teacherId", "==", decodedToken.uid)
            .limit(100)
            .get();

        const leaves = snap.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
            };
        });

        // Manual sort by createdAt descending
        leaves.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({ success: true, data: leaves });

    } catch (error: any) {
        console.error("[API Leaves History] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

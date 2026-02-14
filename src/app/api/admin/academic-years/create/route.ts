
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        const body = await req.json();
        const { yearLabel } = body;

        if (!yearLabel) return NextResponse.json({ error: "Year Label is required" }, { status: 400 });

        const configRef = adminDb.collection("config").doc("academic_years");

        // Prevent duplicates
        const doc = await configRef.get();
        if (doc.exists) {
            const data = doc.data();
            if (data?.currentYear === yearLabel) return NextResponse.json({ error: "Year already active" }, { status: 400 });
            if (data?.upcoming?.some((y: any) => (typeof y === 'string' ? y : y.year) === yearLabel)) {
                return NextResponse.json({ error: "Year already exists in upcoming" }, { status: 400 });
            }
            if (data?.history?.some((h: any) => h.year === yearLabel)) return NextResponse.json({ error: "Year already exists in history" }, { status: 400 });
        }

        await configRef.set({
            upcoming: FieldValue.arrayUnion(yearLabel)
        }, { merge: true });

        return NextResponse.json({ success: true, message: "Year added to upcoming list" });

    } catch (error: any) {
        console.error("Create Year Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

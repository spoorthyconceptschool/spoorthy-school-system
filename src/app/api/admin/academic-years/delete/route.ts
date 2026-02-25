
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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
        const doc = await configRef.get();

        if (!doc.exists) return NextResponse.json({ error: "Config not found" }, { status: 404 });

        const data = doc.data() || {};

        // Safety check: Cannot delete current active year
        if (data.currentYear === yearLabel) {
            return NextResponse.json({ error: "Cannot delete the active academic year. Archive it or switch sessions first." }, { status: 400 });
        }

        let updated = false;

        // 1. Check Upcoming
        if (data.upcoming && Array.isArray(data.upcoming)) {
            const initialLen = data.upcoming.length;
            data.upcoming = data.upcoming.filter((y: any) => {
                const val = typeof y === 'string' ? y : y.year;
                return val !== yearLabel;
            });
            if (data.upcoming.length < initialLen) updated = true;
        }

        // 2. Check History
        if (!updated && data.history && Array.isArray(data.history)) {
            const initialLen = data.history.length;
            data.history = data.history.filter((h: any) => h.year !== yearLabel);
            if (data.history.length < initialLen) updated = true;
        }

        if (updated) {
            await configRef.set(data);
            return NextResponse.json({ success: true, message: "Academic year deleted successfully" });
        } else {
            return NextResponse.json({ error: "Year not found in plan or history" }, { status: 404 });
        }

    } catch (error: any) {
        console.error("Delete Year Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

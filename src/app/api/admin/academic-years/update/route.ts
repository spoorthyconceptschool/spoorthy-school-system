
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
        let { targetYear, newLabel, startDate, endDate } = body;

        targetYear = targetYear?.trim();
        newLabel = newLabel?.trim();

        if (!targetYear) return NextResponse.json({ error: "Target Year Required" }, { status: 400 });

        console.log(`[UpdateYear] Processing: '${targetYear}' -> '${newLabel}'`);

        const configRef = adminDb.collection("config").doc("academic_years");
        const doc = await configRef.get();

        if (!doc.exists) return NextResponse.json({ error: "Config document 'config/academic_years' not found" }, { status: 404 });

        const data = doc.data() || {};
        let updated = false;

        // Clone upcoming to avoid mutation issues during findIndex
        const upcoming = Array.isArray(data.upcoming) ? [...data.upcoming] : [];
        const upcomingIndex = upcoming.findIndex((y: any) => {
            const val = typeof y === 'string' ? y : y.year;
            return val === targetYear;
        });

        if (upcomingIndex !== -1) {
            console.log("Found in upcoming");
            const existing = typeof upcoming[upcomingIndex] === 'string' ? { year: upcoming[upcomingIndex] } : upcoming[upcomingIndex];
            upcoming[upcomingIndex] = {
                ...existing,
                year: newLabel || existing.year,
                startDate: startDate || existing.startDate || null,
                endDate: endDate || existing.endDate || null
            };
            data.upcoming = upcoming;
            updated = true;
        }

        if (!updated && data.currentYear === targetYear) {
            console.log("Found as current year");
            if (newLabel) data.currentYear = newLabel;
            if (startDate) data.currentYearStartDate = startDate;
            if (endDate) data.currentYearEndDate = endDate;
            updated = true;
        }

        if (!updated && Array.isArray(data.history)) {
            const history = [...data.history];
            const historyIndex = history.findIndex((h: any) => h.year === targetYear);
            if (historyIndex !== -1) {
                console.log("Found in history");
                history[historyIndex] = {
                    ...history[historyIndex],
                    year: newLabel || history[historyIndex].year,
                    startDate: startDate || history[historyIndex].startDate || null,
                    archivedAt: endDate || history[historyIndex].archivedAt || null
                };
                data.history = history;
                updated = true;
            }
        }

        if (updated) {
            // Clean undefined values before saving
            const cleanData = JSON.parse(JSON.stringify(data));
            await configRef.update(cleanData);
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: `Academic year '${targetYear}' not found.` }, { status: 404 });
        }

    } catch (error: any) {
        console.error("Update Year Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

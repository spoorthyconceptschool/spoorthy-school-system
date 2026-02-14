
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        const configRef = adminDb.collection("config").doc("academic_years");
        const configSnap = await configRef.get();

        let years = [];

        if (configSnap.exists) {
            const data = configSnap.data() as any;
            const currentYear = data.currentYear;

            // Add Current Year
            if (currentYear) {
                years.push({
                    year: currentYear,
                    isActive: true,
                    startDate: data.currentYearStartDate || data.lastUpdated || new Date().toISOString(),
                    endDate: data.currentYearEndDate || null,
                    stats: null
                });
            }
            if (data?.upcoming && Array.isArray(data.upcoming)) {
                data.upcoming.forEach((item: string | any) => {
                    if (typeof item === 'string') {
                        years.push({
                            year: item,
                            isActive: false,
                            isUpcoming: true,
                            startDate: null,
                            endDate: null,
                            stats: null
                        });
                    } else {
                        years.push({
                            year: item.year,
                            isActive: false,
                            isUpcoming: true,
                            startDate: item.startDate || null,
                            endDate: item.endDate || null,
                            stats: null
                        });
                    }
                });
            }

            if (data?.history && Array.isArray(data.history)) {
                const seenYears = new Set(years.map(y => y.year));

                data.history.forEach((h: any) => {
                    if (!seenYears.has(h.year)) {
                        years.push({
                            year: h.year,
                            isActive: false,
                            startDate: h.startDate || null,
                            endDate: h.archivedAt,
                            stats: {
                                promoted: h.promotedCount || 0,
                                detained: h.archivedCount || 0,
                                total: (h.promotedCount || 0) + (h.archivedCount || 0)
                            }
                        });
                        seenYears.add(h.year);
                    }
                });
            }
        } else {
            // Default if no config exists
            years.push({
                year: "2025-2026",
                isActive: true,
                startDate: new Date().toISOString(),
                endDate: null
            });
        }

        return NextResponse.json({ years });
    } catch (error: any) {
        console.error("Fetch History Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await seedDemoData();
        return NextResponse.json({ success: true, message: "Data seeded successfully with updated ecosystem (200 students)." });
    } catch (error: any) {
        console.error("Seed API Failure:", error);
        return NextResponse.json({
            success: false,
            error: "Failed to seed demo data. Check server logs.",
            details: error.message
        }, { status: 200 }); // Status 200 to prevent HTML error pages
    }
}

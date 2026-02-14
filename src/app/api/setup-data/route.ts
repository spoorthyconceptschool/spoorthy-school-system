import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/demo-data";

export async function GET() {
    try {
        await seedDemoData();
        return NextResponse.json({ success: true, message: "Data seeded successfully with updated schema (Classes with Order)." });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

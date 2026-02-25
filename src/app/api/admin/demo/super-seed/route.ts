import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes for a full ecosystem rebuild
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // 🚨 FATAL SECURITY RISK: This route had no authentication!
    // It has been disabled to prevent accidental or malicious wiping of your production database.
    return NextResponse.json({ success: false, error: "Feature Disabled for Security Reasons. This route was previously unauthenticated and could be used to wipe the database." }, { status: 403 });
}

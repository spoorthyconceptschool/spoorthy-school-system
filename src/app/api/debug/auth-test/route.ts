import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function GET() {
    try {
        console.log("[Debug Auth] Attempting to access adminAuth...");
        const auth = getAdminAuth();
        console.log("[Debug Auth] Successfully got auth object. Calling listUsers...");
        const list = await auth.listUsers(1);
        return NextResponse.json({
            success: true,
            message: "Firebase Auth is WORKING",
            userCount: list.users.length
        });
    } catch (e: any) {
        console.error("[Debug Auth] Failed:", e);
        return NextResponse.json({
            success: false,
            error: e.message,
            code: e.code,
            stack: e.stack
        }, { status: 500 });
    }
}

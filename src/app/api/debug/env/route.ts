import { NextResponse } from "next/server";
import { getInitError } from "@/lib/firebase-admin";

export async function GET() {
    const rawProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const initError = getInitError();

    // Check if secrets are present at least as strings
    const hasEmail = !!(process.env.ADMIN_SDK_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL);
    const hasKey = !!(process.env.ADMIN_SDK_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY);

    return NextResponse.json({
        healthy: !initError,
        status: initError ? "ERROR" : "READY",
        init_error: initError || "NONE",
        secrets_check: {
            has_email: hasEmail,
            has_private_key: hasKey
        },
        project_id_env: rawProjectId || "MISSING",
        node_env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
}

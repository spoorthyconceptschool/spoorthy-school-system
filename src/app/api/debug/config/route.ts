import { NextResponse } from "next/server";
import { getAdminDb, getInitError } from "@/lib/firebase-admin";

export async function GET() {
    try {
        const db = getAdminDb();
        const initError = getInitError();

        if (!db) {
            return NextResponse.json({
                status: "ERROR",
                error: "Firebase Admin not initialized",
                details: initError || "Unknown initialization failure. Check your private key format."
            }, { status: 500 });
        }

        // Test database connectivity
        const collections = await db.listCollections();

        return NextResponse.json({
            status: "SUCCESS",
            message: "Firebase Admin is fully connected",
            database: "Firestore",
            collections_found: collections.length,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("[Debug Config API] Error:", error);
        return NextResponse.json({
            status: "CRASH",
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

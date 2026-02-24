
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb, adminStorage } from "@/lib/firebase-admin";

export const maxDuration = 60; // Allow 60s execution time for Vercel/Next.js
export const dynamic = 'force-dynamic';

// Ultra-fast batch delete wrapper
// Robust recursive delete wrapper - OPTIMIZED FOR LOW MEMORY
async function nukeCollection(col: string) {
    console.log(`[Purge] Nuking collection: ${col}`);
    const ref = adminDb.collection(col);
    let deletedCount = 0;
    try {
        while (true) {
            // Small limit (50) to prevent OOM in 256MB environment
            const snap = await ref.limit(50).select().get();
            if (snap.empty) break;

            const batch = adminDb.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            deletedCount += snap.size;

            // Safety yield
            await new Promise(r => setTimeout(r, 20));
            if (deletedCount > 5000) break; // Hard limit per collection to prevent timeout
        }
        console.log(`[Purge] Finished ${col}. Deleted ~${deletedCount} docs.`);
    } catch (e: any) {
        console.error(`[Purge] Error in ${col}:`, e.message);
    }
}

export async function POST(req: NextRequest) {
    console.log("[Purge] >>> Deep Wipe Sequence Start");
    const startTime = Date.now();

    try {
        // 1. Authorization
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.split("Bearer ").pop()?.trim();
        if (!token) return NextResponse.json({ success: false, error: "Auth Missing" }, { status: 200 });

        const decodedToken = await adminAuth.verifyIdToken(token);
        const isSuperAdmin = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" ||
            decodedToken.email?.includes("admin") || decodedToken.email?.includes("prane");

        if (!isSuperAdmin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 200 });

        // 2. Body Parsing
        let purgeType = 'OPERATIONAL_ONLY';
        try {
            const body = await req.json();
            purgeType = body.type || 'OPERATIONAL_ONLY';
        } catch (e) { /* ignore */ }

        // 3. TARGET SELECTION
        let collectionsToDelete: string[] = [];
        const PROTECTED = [
            'settings', 'users', 'config', 'branding', 'master_classes',
            'master_sections', 'master_villages', 'master_subjects',
            'master_class_sections', 'registry', 'site_content',
            'landing_page', 'cms_content', 'counters'
        ];

        if (purgeType === 'FULL_SYSTEM') {
            const allCols = await adminDb.listCollections();
            collectionsToDelete = allCols.map((c: any) => c.id).filter((id: string) => !PROTECTED.includes(id));
        } else {
            collectionsToDelete = [
                "student_fee_ledgers", "payments", "invoices", "transactions", "fee_structures", "fee_types",
                "ledger", "expenses", "payroll", "attendance", "leaves", "class_timetables", "teacher_schedules",
                "substitutions", "homework", "exam_results", "notifications", "audit_logs", "search_index",
                "students", "teachers", "staff"
            ];
        }

        // 4. SEQUENTIAL EXECUTION (Prevents Memory Spikes)
        console.log(`[Purge] Processing ${collectionsToDelete.length} targets sequentially...`);

        for (const col of collectionsToDelete) {
            await nukeCollection(col);
            // Check for timeout threat
            if (Date.now() - startTime > 50000) {
                console.warn("[Purge] ⚠️ Timeout Approaching. Graceful exit.");
                break;
            }
        }

        // 5. USER ACCOUNTS (Safe Batch)
        if (purgeType === 'FULL_SYSTEM') {
            console.log("[Purge] Nuking User/Auth Registry...");
            const userSnap = await adminDb.collection("users").limit(100).get();
            const userBatch = adminDb.batch();
            userSnap.docs.forEach(doc => {
                const email = doc.data().email?.toLowerCase();
                if (!email?.includes("admin") && !email?.includes("prane")) {
                    userBatch.delete(doc.ref);
                }
            });
            await userBatch.commit();
        }

        const duration = (Date.now() - startTime) / 1000;
        return NextResponse.json({
            success: true,
            message: `Purge sequence finalized in ${duration}s. Type: ${purgeType}`,
            meta: { duration, type: purgeType }
        }, { status: 200 });

    } catch (err: any) {
        console.error("[Purge] FATAL FAILURE:", err.message);
        return NextResponse.json({
            success: false,
            error: "Process Interrupted: The system encountered a resource limit but may have partially cleared data. Please refresh and try again.",
            details: err.message
        }, { status: 200 });
    }
}


import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb, adminStorage } from "@/lib/firebase-admin";

export const maxDuration = 300; // Allow 5 minutes session for deep wipes
export const dynamic = 'force-dynamic';

// Manual batch delete (Stable across all environments)
async function safeDeleteCollection(col: string) {
    console.log(`[Purge] Starting wipe of: ${col}`);
    const ref = adminDb.collection(col);
    let deletedCount = 0;

    try {
        while (true) {
            const snap = await ref.limit(400).get();
            if (snap.empty) break;

            const batch = adminDb.batch();
            snap.docs.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();

            deletedCount += snap.docs.length;
            console.log(`[Purge] Deleted ${deletedCount} from ${col}...`);
            await new Promise(r => setTimeout(r, 50)); // Slight throttle
        }
        console.log(`[Purge] Completed wipe of ${col}. Total: ${deletedCount}`);
        return { col, success: true, count: deletedCount };
    } catch (e: any) {
        console.error(`[Purge] Error wiping ${col}:`, e.message);
        return { col, success: false, error: e.message };
    }
}

export async function POST(req: NextRequest) {
    console.log("[Purge] >>> Incoming Purge Operation <<<");
    const startTime = Date.now();

    try {
        // Authorization
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.split("Bearer ").pop()?.trim();
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const decodedToken = await adminAuth.verifyIdToken(token);
        const isSuperAdmin = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.email?.includes("admin") || decodedToken.email?.includes("prane");

        if (!isSuperAdmin) {
            return NextResponse.json({ success: false, error: "Administrative clearance required." }, { status: 403 });
        }

        // Body Parsing
        let body;
        try { body = await req.json(); } catch (e) { body = {}; }
        const purgeType = body.type || 'OPERATIONAL_ONLY';
        console.log("[Purge] Mode:", purgeType);

        // Task Generation
        const collectionsToWipe: string[] = [];
        const operationalCols = [
            "student_fee_ledgers", "payments", "invoices", "transactions", "fee_structures", "fee_types", "ledger", "expenses", "payroll",
            "attendance", "leaves", "class_timetables", "teacher_schedules", "substitutions", "coverage_tasks",
            "homework", "homework_submissions", "exam_results", "grades",
            "announcements", "events", "notifications", "audit_logs", "notices", "analytics", "reports",
            "feedback", "enquiries", "applications", "custom_fees", "exams", "salaries", "teaching_assignments",
            "timetable_settings", "search_index", "student_leaves"
        ];

        if (purgeType === 'FULL_SYSTEM') {
            const PROTECTED = ['settings', 'users', 'config', 'branding', 'registry', 'site_content', 'landing_page', 'cms_content', 'counters', 'master_classes', 'master_sections', 'master_villages', 'master_subjects', 'master_staff_roles', 'master_class_sections'];
            const allCols = await adminDb.listCollections();
            allCols.forEach((c: any) => {
                if (!PROTECTED.includes(c.id)) collectionsToWipe.push(c.id);
            });
            // Ensure core ones are included if not listed
            ["students", "teachers", "staff"].forEach(c => {
                if (!collectionsToWipe.includes(c)) collectionsToWipe.push(c);
            });
        } else {
            operationalCols.forEach(c => collectionsToWipe.push(c));
        }

        // Execute sequentially to avoid memory pressure and concurrency issues
        const results = [];
        for (const col of collectionsToWipe) {
            const res = await safeDeleteCollection(col);
            results.push(res);
        }

        // Cleanup Users (Safe Wipe)
        if (purgeType === 'FULL_SYSTEM') {
            console.log("[Purge] Resetting User Registry...");
            const SAFE_EMAILS = ["spoorthy@school.local", "pranesh@school.local"];
            const SAFE_UIDS = [decodedToken.uid];

            const userSnap = await adminDb.collection("users").get();
            let batch = adminDb.batch();
            let c = 0;
            for (const doc of userSnap.docs) {
                const d = doc.data();
                if (!SAFE_UIDS.includes(doc.id) && !SAFE_EMAILS.includes(d.email?.toLowerCase())) {
                    batch.delete(doc.ref);
                    c++;
                    if (c === 400) { await batch.commit(); batch = adminDb.batch(); c = 0; }
                }
            }
            if (c > 0) await batch.commit();

            // Reset Counters
            await adminDb.collection("counters").doc("students").set({ current: 0 }, { merge: true });

            // Cleanup RTDB
            if (adminRtdb) {
                await adminRtdb.ref("analytics").remove();
                await adminRtdb.ref("academic_years").remove();
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        return NextResponse.json({
            success: true,
            message: `Wipe successfully finalized in ${duration}s.`,
            meta: { duration, collectionsProcessed: results.length }
        });

    } catch (error: any) {
        console.error("[Purge] FATAL RECOVERY:", error);
        return NextResponse.json({
            success: false,
            error: "System Overload or Failure",
            details: error.message
        }, { status: 200 }); // Status 200 to prevent proxy HTML pages
    }
}

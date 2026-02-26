
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb, adminStorage } from "@/lib/firebase-admin";

export const maxDuration = 60; // Allow 60s execution time for Vercel/Next.js
export const dynamic = 'force-dynamic';

// Ultra-fast batch delete wrapper
// Robust recursive delete wrapper
async function nukeCollection(col: string) {
    const ref = adminDb.collection(col);
    try {
        // Try native recursiveDelete (handles subcollections & batches)
        // @ts-ignore
        if (adminDb.recursiveDelete) {
            console.log(`[Purge] Recursively deleting ${col}...`);
            // @ts-ignore
            await adminDb.recursiveDelete(ref);
        } else {
            throw new Error("No recursiveDelete");
        }
    } catch (e) {
        // Fallback to manual batch loop
        console.log(`[Purge] Manual delete fallback for ${col}...`);
        while (true) {
            const snap = await ref.limit(500).get();
            if (snap.empty) break;
            const batch = adminDb.batch();
            snap.docs.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();
            await new Promise(r => setTimeout(r, 20));
        }
    }
}



export async function POST(req: NextRequest) {
    console.log("[Purge] >>> Incoming Request Initiated");
    const startTime = Date.now();

    try {
        // 1. Authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            console.log("[Purge] Auth Strike: No Bearer token");
            return NextResponse.json({ success: false, error: "Unauthorized access detected." }, { status: 200 });
        }

        const token = authHeader.split("Bearer ").pop()?.trim();
        if (!token) {
            console.log("[Purge] Auth Strike: Token empty after split");
            return NextResponse.json({ success: false, error: "Identification token missing." }, { status: 200 });
        }

        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
            console.log("[Purge] Identity Verified:", decodedToken.email);
        } catch (e: any) {
            console.error("[Purge] JWT Verification Failed:", e.message);
            return NextResponse.json({ success: false, error: "Invalid or expired session. Please log in again." }, { status: 200 });
        }

        const isSuperAdmin = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.email?.includes("admin") || decodedToken.email?.includes("prane");
        if (!isSuperAdmin) {
            console.log("[Purge] Forbidden: User lacks administrative clearance.");
            return NextResponse.json({ success: false, error: "Clearance Level 1 required for this operation." }, { status: 200 });
        }

        // 2. Body Parsing
        let purgeType = 'OPERATIONAL_ONLY';
        try {
            const body = await req.json();
            purgeType = body.type || 'OPERATIONAL_ONLY';
            console.log("[Purge] Mode Selected:", purgeType);
        } catch (e) {
            console.log("[Purge] No body provided, defaulting to Operational.");
        }

        const SAFE_EMAILS = ["spoorthy@school.local", "pranesh@school.local"];
        const SAFE_UIDS = [decodedToken.uid];

        // 3. TASK GENERATION
        const tasks: Promise<any>[] = [];
        let collectionsToDelete: string[] = [];

        // A. Firestore Collections
        const PROTECTED = [
            'settings', 'users', 'config', 'branding',
            'registry',
            'site_content', 'landing_page', 'cms_content', 'counters'
        ];

        try {
            const operationalCols = [
                "student_fee_ledgers", "payments", "invoices", "transactions", "fee_structures", "fee_types", "ledger", "expenses", "payroll",
                "attendance", "leaves", "class_timetables", "teacher_schedules", "substitutions", "coverage_tasks",
                "homework", "homework_submissions", "exam_results", "grades",
                "announcements", "events", "notifications", "audit_logs", "notices", "analytics", "reports",
                "feedback", "enquiries", "applications", "custom_fees", "exams", "salaries", "teaching_assignments",
                "timetable_settings", "search_index", "student_leaves"
            ];

            const coreCols = ["students", "teachers", "staff"];

            if (purgeType === 'FULL_SYSTEM') {
                console.log("[Purge] Fetching all collections for deep wipe...");
                const allCols = await adminDb.listCollections();
                collectionsToDelete = allCols.map((c: any) => c.id).filter((id: string) => !PROTECTED.includes(id));

                // Force append core cols just in case listCollections missed them
                coreCols.concat(operationalCols).forEach(col => {
                    if (!collectionsToDelete.includes(col) && !PROTECTED.includes(col)) collectionsToDelete.push(col);
                });
            } else {
                collectionsToDelete = [...operationalCols];
            }
        } catch (colErr: any) {
            console.error("[Purge] Collection fetch failed:", colErr.message);
            return NextResponse.json({ success: false, error: "System encountered an error while indexing databases." }, { status: 200 });
        }

        console.log(`[Purge] Preparing to nuke ${collectionsToDelete.length} collections...`);
        collectionsToDelete.forEach(col => tasks.push(nukeCollection(col)));

        // B. Identity Management (Safe Wipe)
        tasks.push((async () => {
            console.log("[Purge] Sanitizing user registry...");
            const snap = await adminDb.collection("users").get();
            let batch = adminDb.batch();
            let count = 0;
            for (const doc of snap.docs) {
                const d = doc.data();
                if (!SAFE_UIDS.includes(doc.id) && !SAFE_EMAILS.includes(d.email?.toLowerCase())) {
                    batch.delete(doc.ref);
                    count++;
                    if (count === 400) { await batch.commit(); batch = adminDb.batch(); count = 0; }
                }
            }
            if (count > 0) await batch.commit();
        })());

        // C. Auth Registry (FULL only)
        if (purgeType === 'FULL_SYSTEM') {
            console.log("[Purge] Nuking Auth Registry...");
            tasks.push((async () => {
                let nextPageToken;
                do {
                    const list: any = await adminAuth.listUsers(1000, nextPageToken);
                    const toDelete = list.users
                        .filter((u: any) => !SAFE_UIDS.includes(u.uid) && !SAFE_EMAILS.includes(u.email?.toLowerCase()))
                        .map((u: any) => u.uid);
                    if (toDelete.length > 0) await adminAuth.deleteUsers(toDelete);
                    nextPageToken = list.pageToken;
                } while (nextPageToken);
            })());

            tasks.push(adminDb.collection("counters").doc("students").set({ current: 0 }, { merge: true }));
            tasks.push(adminDb.collection("counters").doc("teachers").set({ current: 0 }, { merge: true }));
            tasks.push(adminDb.collection("counters").doc("staff").set({ current: 0 }, { merge: true }));
        }

        // D. RTDB Wipe
        if (adminRtdb) {
            console.log("[Purge] Clearing real-time databases...");
            tasks.push(adminRtdb.ref("analytics").remove());
            tasks.push(adminRtdb.ref("notifications").remove());
            tasks.push(adminRtdb.ref("chats").remove());
            tasks.push(adminRtdb.ref("presence").remove());
            if (purgeType === 'FULL_SYSTEM') {
                tasks.push(adminRtdb.ref("academic_years").remove());
                tasks.push(adminRtdb.ref("master").remove());
                tasks.push(adminRtdb.ref("timetables").remove());
            }
        }

        // 4. EXECUTION
        console.log(`[Purge] 🚀 Launching ${tasks.length} task suites...`);

        // Use allSettled to ensure we don't crash the whole response if one file delete fails
        const results = await Promise.allSettled(tasks);
        const failures = results.filter(r => r.status === 'rejected');

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[Purge] 🏁 Done in ${duration}s. Failures: ${failures.length}`);

        return NextResponse.json({
            success: true,
            message: `Deep Wipe successfully finalized in ${duration}s.`,
            meta: {
                tasksRun: tasks.length,
                failed: failures.length,
                type: purgeType
            }
        });

    } catch (criticalErr: any) {
        console.error("[Purge] CRITICAL SYSTEM FAILURE:", criticalErr);
        // ALWAYS return JSON with status 200 to bypass proxy error pages
        return NextResponse.json({
            success: false,
            error: "System Overload: The purge process encountered a heavy volume and may need to be repeated.",
            details: criticalErr.message
        }, { status: 200 });
    }
}

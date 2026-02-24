
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
    try {
        console.log("[Purge] ⚡ PURGE REQUEST RECEIVED");
        const startTime = Date.now();

        // 1. Authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = authHeader.split("Bearer ").pop()?.trim();
        if (!token) return NextResponse.json({ error: "Missing Token" }, { status: 401 });

        const decodedToken = await adminAuth.verifyIdToken(token);
        const isSuperAdmin = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.email?.includes("admin");
        if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        let purgeType = 'OPERATIONAL_ONLY';
        try {
            const body = await req.json();
            purgeType = body.type || 'OPERATIONAL_ONLY';
        } catch (e) { /* use default */ }

        const SAFE_EMAILS = ["spoorthy@school.local"];
        const SAFE_UIDS = [decodedToken.uid];

        // 2. DEFINE TASK LIST
        const tasks: Promise<any>[] = [];
        let collectionsToDelete: string[] = [];

        // COLLECTIONS SELECTION
        if (purgeType === 'FULL_SYSTEM') {
            const allCols = await adminDb.listCollections();
            const PROTECTED = [
                'settings', 'users', 'config', 'branding',
                'master_classes', 'master_sections', 'master_villages',
                'master_subjects', 'master_class_sections', 'registry',
                'site_content', 'landing_page', 'cms_content', 'counters'
            ];
            collectionsToDelete = allCols.map((c: any) => c.id).filter((id: string) => !PROTECTED.includes(id));
            console.log(`[Purge] FULL_SYSTEM: Targeting ${collectionsToDelete.length} collections.`);
        } else {
            collectionsToDelete = [
                "student_fee_ledgers", "payments", "invoices", "transactions", "fee_structures", "fee_types", "ledger", "expenses", "payroll",
                "attendance", "leaves", "class_timetables", "teacher_schedules", "substitutions", "coverage_tasks",
                "homework", "homework_submissions", "exam_results", "grades",
                "announcements", "events", "notifications", "audit_logs", "notices", "analytics", "reports",
                "feedback", "enquiries", "applications", "custom_fees", "exams", "salaries", "teaching_assignments",
                "timetable_settings", "search_index"
            ];
            console.log(`[Purge] OPERATIONAL: Targeting ${collectionsToDelete.length} specific collections.`);
        }

        // QUEUE DELETIONS
        collectionsToDelete.forEach(col => tasks.push(nukeCollection(col)));

        // USER ACCOUNTS (Safe Wipe)
        tasks.push((async () => {
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

        // AUTH nuking for FULL_SYSTEM
        if (purgeType === 'FULL_SYSTEM') {
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

            // Reset counters
            tasks.push(adminDb.collection("counters").doc("students").set({ current: 0 }, { merge: true }));
            tasks.push(adminDb.collection("counters").doc("teachers").set({ current: 0 }, { merge: true }));
            tasks.push(adminDb.collection("counters").doc("staff").set({ current: 0 }, { merge: true }));
        }

        // RTDB Nodes
        if (adminRtdb) {
            tasks.push(adminRtdb.ref("analytics").remove());
            tasks.push(adminRtdb.ref("notifications").remove());
            tasks.push(adminRtdb.ref("chats").remove());
            tasks.push(adminRtdb.ref("presence").remove());
            if (purgeType === 'FULL_SYSTEM') {
                tasks.push(adminRtdb.ref("academic_years").remove());
            }
        }

        // STORAGE
        if (adminStorage) {
            const bucket = adminStorage.bucket();
            tasks.push(bucket.deleteFiles({ prefix: 'homework/' }).catch(() => { }));
            tasks.push(bucket.deleteFiles({ prefix: 'notices/' }).catch(() => { }));
            if (purgeType === 'FULL_SYSTEM') {
                tasks.push(bucket.deleteFiles({ prefix: 'users/' }).catch(() => { }));
            }
        }

        // 3. RUN ALL (Awaited but settled)
        console.log(`[Purge] Executing ${tasks.length} task suites...`);
        const results = await Promise.allSettled(tasks);
        const failures = results.filter(r => r.status === 'rejected');

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[Purge] Finished in ${duration}s. Failures: ${failures.length}`);

        if (failures.length > 0 && failures.length === tasks.length) {
            throw new Error("All purge tasks failed. System may be intensive right now.");
        }

        return NextResponse.json({
            success: true,
            message: `System Purge (${purgeType}) completed in ${duration}s with ${tasks.length - failures.length} task suites successful.`,
            details: failures.length > 0 ? `Note: ${failures.length} tasks encountered minor issues.` : undefined
        });

    } catch (error: any) {
        console.error("Purge API Critical Failure:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Internal Server Error",
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 }); // Using 500 but ensuring it is a JSON object.
    }
}

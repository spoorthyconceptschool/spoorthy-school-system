import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Optimized Batch Delete
 * Wipes a collection in batches of 500 (Firestore limit).
 */
async function safeDeleteCollection(col: string) {
    console.log(`[Purge] Starting wipe of: ${col}`);
    const ref = adminDb.collection(col);
    let deletedCount = 0;

    try {
        while (true) {
            const snap = await ref.limit(500).get();
            if (snap.empty) break;

            const batch = adminDb.batch();
            snap.docs.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();

            deletedCount += snap.docs.length;
            if (deletedCount % 1000 === 0) console.log(`[Purge] Deleted ${deletedCount} from ${col}...`);
        }
        console.log(`[Purge] Completed wipe of ${col}. Total: ${deletedCount}`);
        return { col, success: true, count: deletedCount };
    } catch (e: any) {
        console.error(`[Purge] Error wiping ${col}:`, e.message);
        return { col, success: false, error: e.message };
    }
}

/**
 * CONCURRENT PURGE ENGINE
 * Runs multiple collection wipes in parallel with a concurrency limit to prevent 
 * Firestore timeout or memory pressure.
 */
async function parallelWipe(collections: string[], limit: number = 5) {
    const results = [];
    for (let i = 0; i < collections.length; i += limit) {
        const chunk = collections.slice(i, i + limit);
        const chunkResults = await Promise.all(chunk.map(c => safeDeleteCollection(c)));
        results.push(...chunkResults);
    }
    return results;
}

export async function POST(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN'], async (req, decodedUser) => {
        console.log("[Purge] >>> Initiating Secured Purge <<< Actor:", decodedUser.uid);
        const startTime = Date.now();

        try {
            const body = await req.json().catch(() => ({}));
            const purgeType = body.type || 'OPERATIONAL_ONLY';
            console.log("[Purge] Mode:", purgeType);

            // 1. Define Target Collections
            const operationalCols = [
                "student_fee_ledgers", "payments", "invoices", "transactions", "fee_structures", "fee_types", "ledger", "expenses", "payroll",
                "attendance", "leaves", "class_timetables", "teacher_schedules", "substitutions", "coverage_tasks",
                "homework", "homework_submissions", "exam_results", "grades",
                "announcements", "events", "notifications", "audit_logs", "notices", "analytics", "reports",
                "feedback", "enquiries", "applications", "custom_fees", "exams", "salaries", "teaching_assignments",
                "timetable_settings", "search_index", "student_leaves"
            ];

            const systemCols = ["students", "teachers", "staff", "user_actions", "student_keywords", "teacher_keywords"];

            let collectionsToWipe = [...operationalCols];
            if (purgeType === 'FULL_SYSTEM') {
                collectionsToWipe = [...collectionsToWipe, ...systemCols];
            }

            // 2. Execute Firestore Wipes
            const results = await parallelWipe(collectionsToWipe, 6);

            // 3. Perform Auth Cleanup & User Registry Reset (Full Nuke Only)
            if (purgeType === 'FULL_SYSTEM') {
                console.log("[Purge] Commencing Auth User Deletion...");

                const SAFE_EMAILS = ["spoorthy@school.local", "pranesh@school.local"];
                const SAFE_UIDS = [decodedUser.uid];

                // Fetch all users to identify who needs deletion
                const userSnap = await adminDb.collection("users").get();
                const uidsToDelete: string[] = [];

                console.log(`[Purge] Found ${userSnap.docs.length} users. Filtering...`);

                // 3a. Firestore User Reset (Chunked commits to prevent batch limit crash)
                let userBatch = adminDb.batch();
                let batchCount = 0;
                let totalDeleted = 0;

                for (const doc of userSnap.docs) {
                    const data = doc.data();
                    if (!SAFE_UIDS.includes(doc.id) && !SAFE_EMAILS.includes(data.email?.toLowerCase())) {
                        uidsToDelete.push(doc.id);
                        userBatch.delete(doc.ref);
                        batchCount++;
                        totalDeleted++;

                        // Commit every 450 operations (Firestore limit is 500)
                        if (batchCount >= 450) {
                            await userBatch.commit();
                            userBatch = adminDb.batch();
                            batchCount = 0;
                        }
                    }
                }
                if (batchCount > 0) await userBatch.commit();
                console.log(`[Purge] Firestore registry cleared (${totalDeleted} records).`);

                // 3b. Auth User Deletion (Admin SDK limit is 1000 per call)
                console.log(`[Purge] Deleting ${uidsToDelete.length} Auth accounts...`);
                for (let i = 0; i < uidsToDelete.length; i += 1000) {
                    const chunk = uidsToDelete.slice(i, i + 1000);
                    try {
                        await adminAuth.deleteUsers(chunk);
                    } catch (e: any) {
                        console.error("[Purge] Auth Chunk Delete Failure:", e.message);
                    }
                }

                // Reset Counters
                await adminDb.collection("counters").doc("students").set({ current: 0 }, { merge: true });
                await adminDb.collection("counters").doc("teachers").set({ current: 0 }, { merge: true });

                // RTDB Cleanup
                try {
                    if (adminRtdb) {
                        await adminRtdb.ref("analytics").remove();
                        await adminRtdb.ref("attendance").remove();
                        await adminRtdb.ref("realtime_notifications").remove();
                    }
                } catch (rtdbErr) {
                    console.warn("[Purge] RTDB Cleanup missed:", rtdbErr);
                }
            }

            const duration = (Date.now() - startTime) / 1000;
            return NextResponse.json({
                success: true,
                message: `System Wiped Successfully (${duration}s).`,
                details: {
                    collections: results.length,
                    duration
                }
            });

        } catch (error: any) {
            console.error("[Purge] CRITICAL FAIL:", error);
            return NextResponse.json({
                success: false,
                error: "Wipe Interrupted",
                message: error.message
            }, { status: 500 });
        }
    });
}


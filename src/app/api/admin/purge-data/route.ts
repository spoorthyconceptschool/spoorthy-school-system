
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
        console.log("[Purge] ⚡ INSTANT WIPE REQUEST RECEIVED");
        const startTime = Date.now();

        // 1. Authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        const isSuperAdmin = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.email?.includes("admin");
        if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });


        let purgeType = 'OPERATIONAL_ONLY';
        try {
            const body = await req.json();
            purgeType = body.type || 'OPERATIONAL_ONLY';
        } catch (e) {
            // No body provided, use default
        }

        const SAFE_EMAILS = ["spoorthy@school.local"];
        const SAFE_UIDS = [decodedToken.uid];

        // 2. DIAGNOSTIC COUNT
        const studentCount = (await adminDb.collection("students").count().get()).data().count;
        const teacherCount = (await adminDb.collection("teachers").count().get()).data().count;
        console.log(`[Purge] Type: ${purgeType} | Current Students: ${studentCount}, Teachers: ${teacherCount}.`);

        // 3. DEFINE BACKGROUND WORKER
        const performBackgroundWipe = async () => {
            console.log(`[PurgeWorker] Starting ${purgeType} wipe...`);
            const tasks: Promise<any>[] = [];

            // A. FIRESTORE COLLECTIONS
            let collectionsToDelete: string[] = [];

            if (purgeType === 'FULL_SYSTEM') {
                // Dynamic Fetch: Get ALL top-level collections
                const allCollections = await adminDb.listCollections();
                // CRITICAL: Protect 'Formats', 'Branding', and 'Registry' even in FULL wipe
                const PROTECTED_COLLECTIONS = [
                    'settings', 'users', 'config',
                    'master_classes', 'master_sections', 'master_villages',
                    'master_subjects', 'master_class_sections', 'groups'
                ];

                collectionsToDelete = allCollections
                    .map((col: any) => col.id)
                    .filter((id: string) => !PROTECTED_COLLECTIONS.includes(id));

                console.log(`[Purge] Full System Nuke (Protected Formats: ${PROTECTED_COLLECTIONS.join(', ')}). FOUND TO DELETE:`, collectionsToDelete);
            } else {
                // OPERATIONAL_ONLY: Keep core entities (students, teachers, staff, users)
                // AND Keep master data (classes, sections, villages, subjects) which are "formats"
                collectionsToDelete = [
                    "student_fee_ledgers", "payments", "invoices", "transactions", "fee_structures", "fee_types", "ledger", "expenses", "payroll",
                    "attendance", "leaves", "class_timetables", "teacher_schedules", "substitutions", "coverage_tasks",
                    "homework", "homework_submissions", "exam_results", "grades",
                    "announcements", "events", "notifications", "audit_logs", "notices", "analytics", "reports",
                    "feedback", "enquiries", "applications",
                    // DO NOT DELETE: villages, classes, sections, subjects anymore (they are formats)
                    // "villages", "classes", "sections", "subjects",
                    // New additions based on feedback
                    "custom_fees", "exams", "salaries", "teaching_assignments", "timetable_settings", "search_index"
                ];
            }

            collectionsToDelete.forEach(col => tasks.push(nukeCollection(col)));

            // B. FIRESTORE USERS (Linked to Auth but stored in DB)
            // Logic for FULL_SYSTEM to protect SAFE Users
            if (purgeType === 'FULL_SYSTEM') {
                // 'users' already excluded via PROTECTED_COLLECTIONS check above
            }

            collectionsToDelete.forEach(col => tasks.push(nukeCollection(col)));

            // B. FIRESTORE USERS (Linked to Auth but stored in DB)
            // Always run this safe deletion for users if it wasn't nuked above
            tasks.push((async () => {
                const snap = await adminDb.collection("users").get();
                const batch = adminDb.batch();
                let count = 0;
                snap.docs.forEach((doc: any) => {
                    const d = doc.data();
                    if (!SAFE_UIDS.includes(doc.id) && !SAFE_EMAILS.includes(d.email?.toLowerCase())) {
                        batch.delete(doc.ref);
                        count++;
                    }
                });
                if (count > 0) await batch.commit();
            })());

            // C. RTDB
            if (adminRtdb) {
                // NEVER delete the 'master' node as it contains branding and formats
                // if (purgeType === 'FULL_SYSTEM') {
                //     tasks.push(adminRtdb.ref("master").remove());
                // }
                // tasks.push(adminRtdb.ref("siteContent").remove());
                tasks.push(adminRtdb.ref("analytics").remove());
                tasks.push(adminRtdb.ref("notifications").remove());
                tasks.push(adminRtdb.ref("chats").remove());
                tasks.push(adminRtdb.ref("presence").remove());
            }

            // D. AUTH (Conditional)
            if (purgeType === 'FULL_SYSTEM') {
                tasks.push((async () => {
                    let nextPageToken;
                    do {
                        const list: any = await adminAuth.listUsers(1000, nextPageToken);
                        const uidsToDelete = list.users
                            .filter((u: any) => !SAFE_UIDS.includes(u.uid) && !SAFE_EMAILS.includes(u.email?.toLowerCase()))
                            .map((u: any) => u.uid);

                        if (uidsToDelete.length > 0) await adminAuth.deleteUsers(uidsToDelete);
                        nextPageToken = list.pageToken;
                    } while (nextPageToken);
                })());
            }

            // E. COUNTERS (Optional for Operational, essential for Full)
            if (purgeType === 'FULL_SYSTEM') {
                // Wait for delete to finish before setting? 
                // nukeCollection is pushed to tasks. 
                // We should probably delay this slightly or rely on Promise.all handling distinct doc writes vs collection deletes.
                // Actually, nukeCollection deletes documents. Setting a doc afterwards is fine.
                tasks.push(adminDb.collection("counters").doc("students").set({ current: 0 }));
                tasks.push(adminDb.collection("counters").doc("teachers").set({ current: 0 }));
                tasks.push(adminDb.collection("counters").doc("staff").set({ current: 0 }));
            }

            // F. STORAGE (Best effort)
            if (adminStorage) {
                if (purgeType === 'FULL_SYSTEM') {
                    tasks.push(adminStorage.bucket().deleteFiles({ prefix: 'users/' }).catch((e: any) => console.warn("Storage Wipe Error:", e)));
                }
                // tasks.push(adminStorage.bucket().deleteFiles({ prefix: 'siteMedia/' }).catch((e: any) => console.warn("Storage Wipe Error:", e)));
                tasks.push(adminStorage.bucket().deleteFiles({ prefix: 'homework/' }).catch((e: any) => console.warn("Storage Wipe Error:", e)));
                tasks.push(adminStorage.bucket().deleteFiles({ prefix: 'notices/' }).catch((e: any) => console.warn("Storage Wipe Error:", e)));
            }

            // WAIT FOR ALL
            await Promise.all(tasks);
            console.log(`[PurgeWorker] 🏁 ${purgeType} COMPLETED in ${(Date.now() - startTime) / 1000}s`);
        };

        // 3. EXECUTE WIPE (Awaited to ensure completion)
        try {
            await performBackgroundWipe();
        } catch (err) {
            console.error("[PurgeWorker] FATAL ERROR:", err);
            throw err; // Re-throw to be caught by outer catch
        }

        // 4. RESPONSE
        return NextResponse.json({
            success: true,
            message: `Wipe (${purgeType}) Completed successfully. Entities preserved: ${purgeType === 'OPERATIONAL_ONLY' ? 'YES' : 'NO'}.`
        });

    } catch (error: any) {
        console.error("Purge Failed:", error);
        return NextResponse.json({
            error: error.message || "Unknown error during purge",
            stack: error.stack
        }, { status: 500 });
    }
}

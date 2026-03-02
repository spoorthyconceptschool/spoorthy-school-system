
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        const body = await req.json();
        const { yearLabel } = body;

        if (!yearLabel) return NextResponse.json({ error: "Year Label is required" }, { status: 400 });

        const configRef = adminDb.collection("config").doc("academic_years");
        const doc = await configRef.get();

        if (!doc.exists) return NextResponse.json({ error: "Config not found" }, { status: 404 });

        const data = doc.data() || {};

        // Safety check: Cannot delete current active year
        if (data.currentYear === yearLabel) {
            return NextResponse.json({ error: "Cannot delete the active academic year. Archive it or switch sessions first." }, { status: 400 });
        }

        let updated = false;

        // 1. Check Upcoming
        if (data.upcoming && Array.isArray(data.upcoming)) {
            const initialLen = data.upcoming.length;
            data.upcoming = data.upcoming.filter((y: any) => {
                const val = typeof y === 'string' ? y : y.year;
                return val !== yearLabel;
            });
            if (data.upcoming.length < initialLen) updated = true;
        }

        // 2. Check History
        if (!updated && data.history && Array.isArray(data.history)) {
            const initialLen = data.history.length;
            data.history = data.history.filter((h: any) => h.year !== yearLabel);
            if (data.history.length < initialLen) updated = true;
        }

        if (updated) {
            await configRef.set(data);

            // --- PERMANENT WIPE: CLEANUP LINKED FOOTPRINTS ---
            const cleanupTasks: Promise<any>[] = [];

            // 1. Firestore Data Scoping (Collections with year-based IDs or where year is a field)
            const collectionsToScrub = [
                "student_fee_ledgers", "payments", "invoices", "transactions", "fee_structures",
                "attendance", "attendance_daily", "class_timetables", "teacher_schedules",
                "homework", "homework_submissions", "exam_results", "system_aggregates"
            ];

            collectionsToScrub.forEach(col => {
                cleanupTasks.push((async () => {
                    const ref = adminDb.collection(col);
                    // Standard pattern in our app uses {id}_{year} or fields
                    const snap = await ref.where("academicYear", "==", yearLabel).get();
                    const batch = adminDb.batch();
                    snap.docs.forEach((d: any) => batch.delete(d.ref));
                    await batch.commit();

                    // Check for ID-based linked records (e.g., ledgers)
                    const idSnap = await ref.get();
                    const idBatch = adminDb.batch();
                    idSnap.docs.forEach((d: any) => {
                        if (d.id.includes(yearLabel)) idBatch.delete(d.ref);
                    });
                    await idBatch.commit();
                })());
            });

            // 2. RTDB Cleanup
            cleanupTasks.push(adminRtdb.ref(`timetables/${yearLabel}`).remove());
            cleanupTasks.push(adminRtdb.ref(`master/${yearLabel}`).remove());

            // 3. Search Index Scrub
            cleanupTasks.push((async () => {
                const searchSnap = await adminDb.collection("search_index").get();
                const sBatch = adminDb.batch();
                searchSnap.docs.forEach((d: any) => {
                    if (d.data().subtitle?.includes(yearLabel)) sBatch.delete(d.ref);
                });
                await sBatch.commit();
            })());

            await Promise.allSettled(cleanupTasks);

            return NextResponse.json({ success: true, message: "Academic year and all linked footprints permanently deleted." });
        } else {
            return NextResponse.json({ error: "Year not found in plan or history" }, { status: 404 });
        }

    } catch (error: any) {
        console.error("Delete Year Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

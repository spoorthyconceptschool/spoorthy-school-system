import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (authError) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Only Super Admin can delete a branch
        if (decodedToken.role !== "SUPER_ADMIN" && !decodedToken.email?.includes("admin")) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { branchId } = body;

        if (!branchId) {
            return NextResponse.json({ success: false, error: "Missing branchId" }, { status: 400 });
        }

        console.log(`[API Branch Delete] Initiating cleanup for branch: ${branchId}`);

        // Define sets to collect UIDs and document paths to delete
        const authUidsToDelete = new Set<string>();
        const firestorePathsToDelete: string[] = [];

        const authCollections = ["users", "students", "teachers", "staff"];
        const tenantCollections = [
            "classes", "master_classes", "subjects", "sections", "academic_years", "groups",
            "fee_structures", "custom_fees", "student_fee_ledgers", "payments", "salary_payments",
            "attendance_daily", "student_leaves", "leave_requests", "leave_balances",
            "homework", "notices", "exams", "exam_syllabus", "exam_results",
            "student_change_requests", "timetable_entries", "substitutions",
            "notifications", "search_index", "settings", "student_documents", "documents"
        ];

        // 1. Process Auth Collections (Extract UIDs and Queue Doc Deletions)
        for (const col of authCollections) {
            const byBranch = await adminDb.collection(col).where("branchId", "==", branchId).get();
            byBranch.forEach((doc: any) => {
                if (col === "users") authUidsToDelete.add(doc.id);
                if (doc.data().uid) authUidsToDelete.add(doc.data().uid);
                firestorePathsToDelete.push(`${col}/${doc.id}`);
            });

            const bySchool = await adminDb.collection(col).where("schoolId", "==", branchId).get();
            bySchool.forEach((doc: any) => {
                if (col === "users") authUidsToDelete.add(doc.id);
                if (doc.data().uid) authUidsToDelete.add(doc.data().uid);
                if (!firestorePathsToDelete.includes(`${col}/${doc.id}`)) {
                    firestorePathsToDelete.push(`${col}/${doc.id}`);
                }
            });
        }

        // 2. Process all other tenant data collections (Queue Doc Deletions)
        for (const col of tenantCollections) {
            const byBranch = await adminDb.collection(col).where("branchId", "==", branchId).get();
            byBranch.forEach((doc: any) => {
                firestorePathsToDelete.push(`${col}/${doc.id}`);
            });

            const bySchool = await adminDb.collection(col).where("schoolId", "==", branchId).get();
            bySchool.forEach((doc: any) => {
                if (!firestorePathsToDelete.includes(`${col}/${doc.id}`)) {
                    firestorePathsToDelete.push(`${col}/${doc.id}`);
                }
            });
        }

        // 5. Add the branch document itself to the delete list
        firestorePathsToDelete.push(`branches/${branchId}`);

        // 6. Delete users from Firebase Authentication
        const uidsArray = Array.from(authUidsToDelete);
        console.log(`[API Branch Delete] Auth users to delete (${uidsArray.length}):`, uidsArray);
        if (uidsArray.length > 0) {
            // Firebase Auth deleteUsers supports up to 1000 users at once
            const chunkSize = 1000;
            for (let i = 0; i < uidsArray.length; i += chunkSize) {
                const chunk = uidsArray.slice(i, i + chunkSize);
                await adminAuth.deleteUsers(chunk);
            }
        }

        // 7. Delete Firestore documents
        console.log(`[API Branch Delete] Firestore docs to delete (${firestorePathsToDelete.length}):`, firestorePathsToDelete);
        if (firestorePathsToDelete.length > 0) {
            // Firestore batches support up to 500 writes
            const chunkSize = 500;
            for (let i = 0; i < firestorePathsToDelete.length; i += chunkSize) {
                const chunk = firestorePathsToDelete.slice(i, i + chunkSize);
                const batch = adminDb.batch();
                chunk.forEach(path => {
                    batch.delete(adminDb.doc(path));
                });
                await batch.commit();
            }
        }

        // 8. Delete RTDB reference if exists (optional cleanup)
        try {
            await adminRtdb.ref(`students`).orderByChild("branchId").equalTo(branchId).once("value", async (snap: any) => {
                if (snap.exists()) {
                    const updates: any = {};
                    Object.keys(snap.val()).forEach(key => {
                        updates[key] = null;
                    });
                    await adminRtdb.ref(`students`).update(updates);
                }
            });
        } catch (rtdbErr) {
            console.warn("[API Branch Delete] RTDB cleanup warning:", rtdbErr);
        }

        console.log(`[API Branch Delete] Cleanup successful for branch: ${branchId}`);
        return NextResponse.json({ success: true, message: "Branch and all associated user accounts deleted successfully" });

    } catch (error: any) {
        console.error("[API Branch Delete] Fatal Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

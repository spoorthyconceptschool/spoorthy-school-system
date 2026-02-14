import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        console.log("Starting Search Re-indexing...");

        // Keyword Generation Logic
        const generateKeywords = (text: string) => {
            if (!text) return [];
            const keywords = new Set<string>();
            const normalized = text.toLowerCase().trim();
            keywords.add(normalized);
            const tokens = normalized.split(/\s+/);
            tokens.forEach(t => keywords.add(t));
            tokens.forEach(token => {
                for (let i = 2; i <= token.length; i++) {
                    keywords.add(token.substring(0, i));
                }
            });
            return Array.from(keywords);
        };

        const batch = adminDb.batch();
        let count = 0;
        let batchCount = 0;

        const commitBatch = async () => {
            if (batchCount > 0) {
                await batch.commit();
                batchCount = 0;
                // Note: batch object is single-use, need recreate?
                // Actually in admin SDK batch can be reused? No.
                // Re-create batch logic needed if > 500.
                // However, `batch.commit()` returns a Promise. 
                // The correct pattern is batch = adminDb.batch() again.
                // Let's keep it simple: just limit to 500 for now or use looping.
            }
        };

        // Simplified: iterate and use separate batches if needed
        // Fetch all students (limit 400 to fit in one batch for now to avoid complexity)
        // If > 400, need real pagination.

        // Re-write to handle loop properly
        const studentsSnap = await adminDb.collection("students").get();
        const teachersSnap = await adminDb.collection("teachers").get();

        const allDocs = [...studentsSnap.docs, ...teachersSnap.docs];

        // Batching chunks
        const chunkSize = 400;
        for (let i = 0; i < allDocs.length; i += chunkSize) {
            const chunk = allDocs.slice(i, i + chunkSize);
            const currentBatch = adminDb.batch();

            chunk.forEach(doc => {
                const data = doc.data();
                const isStudent = data.studentName !== undefined;

                let keywords: string[] = [];
                let title = "";
                let subtitle = "";
                let url = "";
                let type = "";

                if (isStudent) {
                    type = "student";
                    title = data.studentName || "Unknown";
                    subtitle = `${data.className || ""} | ${data.parentMobile || ""}`;
                    url = `/admin/students/${doc.id}`;
                    keywords = [
                        ...generateKeywords(data.studentName || ""),
                        ...generateKeywords(doc.id),
                        ...generateKeywords(data.parentMobile || ""),
                        ...generateKeywords(data.className || ""),
                        ...generateKeywords(data.villageName || "")
                    ];
                } else {
                    type = "teacher";
                    title = data.name || "Unknown";
                    subtitle = `Teacher - ${data.mobile || ""}`;
                    url = `/admin/teachers`;
                    keywords = [
                        ...generateKeywords(data.name || ""),
                        ...generateKeywords(doc.id),
                        ...generateKeywords(data.mobile || ""),
                        ...generateKeywords("Teacher")
                    ];
                }

                const ref = adminDb.collection("search_index").doc(doc.id);
                currentBatch.set(ref, {
                    id: doc.id,
                    entityId: doc.id,
                    type,
                    title,
                    subtitle,
                    url,
                    keywords: Array.from(new Set(keywords)),
                    updatedAt: FieldValue.serverTimestamp()
                });
            });

            await currentBatch.commit();
            count += chunk.length;
            console.log(`Indexed chunk ${i / chunkSize + 1}`);
        }

        return NextResponse.json({ success: true, message: `Re-indexed ${count} items.` });

    } catch (error: any) {
        console.error("Reindex Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

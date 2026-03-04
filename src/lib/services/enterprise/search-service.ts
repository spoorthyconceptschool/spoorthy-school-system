import { adminDb, FieldValue } from "@/lib/firebase-admin";

/**
 * Enterprise Search Indexing Service
 * 
 * Centralizes the logic for maintaining the global search index across multiple
 * entity types (Students, Teachers, Staff). Ensures that the search cache is
 * always synchronized with the primary data records.
 */
export class SearchService {

    /**
     * Generates an array of search keywords for a given text string.
     * Supports prefix matching and tokenization.
     */
    static generateKeywords(text: string): string[] {
        if (!text) return [];
        const keywords = new Set<string>();
        const normalized = text.toLowerCase().trim();

        // 1. Full matches
        keywords.add(normalized);

        // 2. Tokenize by space
        const tokens = normalized.split(/\s+/);
        tokens.forEach(t => keywords.add(t));

        // 3. Generate Prefixes (min 1 char) for each token
        tokens.forEach(token => {
            for (let i = 1; i <= token.length; i++) {
                keywords.add(token.substring(0, i));
            }
        });

        return Array.from(keywords);
    }

    /**
     * Indexes a student record for the global search system.
     */
    static async indexStudent(studentId: string, data: any, batch?: FirebaseFirestore.WriteBatch) {
        const keywords = Array.from(new Set([
            ...this.generateKeywords(data.studentName || ""),
            ...this.generateKeywords(studentId),
            ...this.generateKeywords(data.parentMobile || ""),
            ...this.generateKeywords(data.className || ""),
            ...this.generateKeywords(data.villageName || "")
        ]));

        const searchItem = {
            id: studentId,
            entityId: studentId,
            type: "student",
            title: data.studentName || "Unknown Student",
            subtitle: `${data.className || ""} | ${data.parentMobile || ""}`,
            url: `/admin/students/${studentId}`,
            keywords,
            updatedAt: FieldValue.serverTimestamp()
        };

        const ref = adminDb.collection("search_index").doc(studentId);
        if (batch) {
            batch.set(ref, searchItem);
        } else {
            await ref.set(searchItem);
        }
    }

    /**
     * Indexes a teacher or staff record.
     */
    static async indexStaff(staffId: string, data: any, type: "teacher" | "staff", batch?: FirebaseFirestore.WriteBatch) {
        const keywords = Array.from(new Set([
            ...this.generateKeywords(data.name || ""),
            ...this.generateKeywords(staffId),
            ...this.generateKeywords(data.mobile || ""),
            type,
            ...(type === 'teacher' ? ['faculty'] : ['helper'])
        ]));

        const title = data.name || "Unknown Staff";
        const role = data.roleCode || (type === "teacher" ? "Teacher" : "Staff");

        const searchItem = {
            id: staffId,
            entityId: staffId,
            type,
            title,
            subtitle: `${role} | ${staffId}`,
            url: type === "teacher" ? `/admin/teachers/${staffId}` : `/admin/staff/${staffId}`,
            keywords,
            updatedAt: FieldValue.serverTimestamp()
        };

        const ref = adminDb.collection("search_index").doc(staffId);
        if (batch) {
            batch.set(ref, searchItem);
        } else {
            await ref.set(searchItem);
        }
    }

    /**
     * Removes an entity from the search index.
     */
    static async removeFromIndex(entityId: string, batch?: FirebaseFirestore.WriteBatch) {
        const ref = adminDb.collection("search_index").doc(entityId);
        if (batch) {
            batch.delete(ref);
        } else {
            await ref.delete();
        }
    }
}

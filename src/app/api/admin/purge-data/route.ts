import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";
import { FieldPath } from "firebase-admin/firestore";

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Optimized Batch Delete
 * Wipes a collection in batches of 500 (Firestore limit).
 */
async function safeDeleteCollection(col: string, tenantId?: string | null) {
    console.log(`[Purge] Starting wipe of: ${col} ${tenantId ? `(Tenant: ${tenantId})` : '(GLOBAL)'}`);
    const ref = adminDb.collection(col);
    let deletedCount = 0;

    const deleteQuery = async (queryRef: FirebaseFirestore.Query) => {
        while (true) {
            const snap = await queryRef.limit(500).get();
            if (snap.empty) break;

            const batch = adminDb.batch();
            snap.docs.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();
            deletedCount += snap.docs.length;
            if (deletedCount % 1000 === 0) console.log(`[Purge] Deleted ${deletedCount} from ${col}...`);
        }
    };

    try {
        if (!tenantId) {
            // Global wipe
            await deleteQuery(ref);
        } else {
            // Resolve the branch's other identifiers
            let branchDocId = tenantId;
            let branchSchoolId = "";
            let branchCode = "";

            try {
                // Try to load the branch document from Firestore to get its schoolId and branchCode
                const branchSnap = await adminDb.collection("branches").doc(tenantId).get();
                if (branchSnap.exists) {
                    const data = branchSnap.data();
                    branchSchoolId = data?.schoolId || "";
                    branchCode = data?.branchCode || "";
                } else {
                    // Maybe tenantId is the schoolId field? Let's search by schoolId
                    const querySnap = await adminDb.collection("branches").where("schoolId", "==", tenantId).get();
                    if (!querySnap.empty) {
                        branchDocId = querySnap.docs[0].id;
                        const data = querySnap.docs[0].data();
                        branchSchoolId = data.schoolId || "";
                        branchCode = data.branchCode || "";
                    }
                }
            } catch (branchErr) {
                console.warn("[Purge] Failed to resolve branch mappings:", branchErr);
            }

            console.log(`[Purge] Wiping tenant matching: DocID: ${branchDocId}, SchoolID: ${branchSchoolId}, Code: ${branchCode}`);

            // Gather all matchers to delete
            // 1. Match by branchId field
            await deleteQuery(ref.where("branchId", "==", branchDocId));
            if (branchSchoolId) await deleteQuery(ref.where("branchId", "==", branchSchoolId));

            // 2. Match by schoolId field
            await deleteQuery(ref.where("schoolId", "==", branchDocId));
            if (branchSchoolId) await deleteQuery(ref.where("schoolId", "==", branchSchoolId));

            // 3. Match by document ID prefix (e.g. W4ZEOJXUpmccvyffIaIo_SHS1005)
            // This is extremely safe and covers all documents created under this branch prefix
            await deleteQuery(ref.where(FieldPath.documentId(), ">=", `${branchDocId}_`).where(FieldPath.documentId(), "<=", `${branchDocId}_\uf8ff`));
            if (branchSchoolId) {
                await deleteQuery(ref.where(FieldPath.documentId(), ">=", `${branchSchoolId}_`).where(FieldPath.documentId(), "<=", `${branchSchoolId}_\uf8ff`));
            }
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
 */
async function parallelWipe(collections: string[], limit: number = 5, tenantId?: string | null) {
    const results = [];
    for (let i = 0; i < collections.length; i += limit) {
        const chunk = collections.slice(i, i + limit);
        const chunkResults = await Promise.all(chunk.map(c => safeDeleteCollection(c, tenantId)));
        results.push(...chunkResults);
    }
    return results;
}

export async function POST(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN', 'SUPER_ADMIN', 'DEVELOPER', 'OWNER'], async (req, decodedUser) => {
        console.log("[Purge] >>> Initiating Secured Purge <<< Actor:", decodedUser.uid);
        const startTime = Date.now();

        try {
            const body = await req.json().catch(() => ({}));
            const purgeType = body.type || 'OPERATIONAL_ONLY';
            console.log("[Purge] Mode:", purgeType);

            // 1. DYNAMIC COLLECTION DISCOVERY (TRUE NUKE)
            const allCollections = await adminDb.listCollections();
            const whitelist = ["config", "siteContent", "users", "master_staff_roles"];
            
            const collectionsToWipe = allCollections
                .map((c: any) => c.id)
                .filter((id: any) => {
                    if (purgeType === 'FULL_SYSTEM') {
                        // In full system, we only keep the bare essentials
                        return !whitelist.includes(id);
                    } else {
                        // In operational only, we keep core registries
                        const registries = ["students", "teachers", "staff", "groups", "villages", "users"];
                        return !whitelist.includes(id) && !registries.includes(id);
                    }
                });

            console.log(`[Purge] Wiping discovered collections: ${collectionsToWipe.join(", ")}`);

            const isSuperAdmin = decodedUser.role === 'SUPER_ADMIN' || decodedUser.role === 'super-admin' || ['spoorthy@school.local', 'pranesh@school.local'].includes(decodedUser.email);
            const targetTenantId = isSuperAdmin ? null : (body.schoolId || decodedUser.schoolId || decodedUser.branchId);

            // 2. Execute Firestore Wipes
            const results = await parallelWipe(collectionsToWipe, 8, targetTenantId);

            // Wipe alumni in OPERATIONAL_ONLY mode since students collection is preserved
            if (purgeType === 'OPERATIONAL_ONLY') {
                try {
                    console.log("[Purge] Deleting all alumni students under operational mode...");
                    let q1 = adminDb.collection("students").where("status", "==", "ALUMNI");
                    if (targetTenantId) {
                        // 1. Delete by branchId field
                        const snap1 = await q1.where("branchId", "==", targetTenantId).get();
                        const b1 = adminDb.batch();
                        snap1.docs.forEach((doc: any) => b1.delete(doc.ref));
                        await b1.commit();

                        // 2. Delete by schoolId field
                        const snap2 = await q1.where("schoolId", "==", targetTenantId).get();
                        const b2 = adminDb.batch();
                        snap2.docs.forEach((doc: any) => b2.delete(doc.ref));
                        await b2.commit();

                        // 3. Delete by document ID range prefix
                        const snap3 = await q1
                            .where(FieldPath.documentId(), ">=", `${targetTenantId}_`)
                            .where(FieldPath.documentId(), "<=", `${targetTenantId}_\uf8ff`)
                            .get();
                        const b3 = adminDb.batch();
                        snap3.docs.forEach((doc: any) => b3.delete(doc.ref));
                        await b3.commit();

                        console.log(`[Purge] Wiped alumni records under operational mode.`);
                    } else {
                        // Global wipe of all alumni
                        const snapAll = await q1.get();
                        const bAll = adminDb.batch();
                        snapAll.docs.forEach((doc: any) => bAll.delete(doc.ref));
                        await bAll.commit();
                        console.log(`[Purge] Wiped all ${snapAll.size} alumni records globally.`);
                    }
                } catch (alumniErr: any) {
                    console.warn("[Purge] Failed to wipe alumni students:", alumniErr.message);
                }
            }

            // 3. Perform Auth Cleanup & Counter Reset (Full Nuke Only)
            if (purgeType === 'FULL_SYSTEM') {
                console.log("[Purge] Commencing Auth User Deletion...");

                const SAFE_EMAILS = ["spoorthy@school.local", "pranesh@school.local"];
                const SAFE_UIDS = [decodedUser.uid];

                // Fetch all users to identify who needs deletion
                let userDocs: any[] = [];
                if (targetTenantId) {
                    const snapSchool = await adminDb.collection("users").where("schoolId", "==", targetTenantId).get();
                    const snapBranch = await adminDb.collection("users").where("branchId", "==", targetTenantId).get();
                    const seen = new Set();
                    snapSchool.docs.forEach((d: any) => {
                        userDocs.push(d);
                        seen.add(d.id);
                    });
                    snapBranch.docs.forEach((d: any) => {
                        if (!seen.has(d.id)) {
                            userDocs.push(d);
                        }
                    });
                } else {
                    const snapAll = await adminDb.collection("users").get();
                    userDocs = snapAll.docs;
                }
                const uidsToDelete: string[] = [];

                let userBatch = adminDb.batch();
                let batchCount = 0;
                let totalDeleted = 0;

                for (const doc of userDocs) {
                    const data = doc.data();
                    if (!SAFE_UIDS.includes(doc.id) && !SAFE_EMAILS.includes(data.email?.toLowerCase())) {
                        uidsToDelete.push(doc.id);
                        userBatch.delete(doc.ref);
                        batchCount++;
                        totalDeleted++;

                        if (batchCount >= 450) {
                            await userBatch.commit();
                            userBatch = adminDb.batch();
                            batchCount = 0;
                        }
                    }
                }
                if (batchCount > 0) await userBatch.commit();

                // Auth Deletion
                for (let i = 0; i < uidsToDelete.length; i += 1000) {
                    const chunk = uidsToDelete.slice(i, i + 1000);
                    try { await adminAuth.deleteUsers(chunk); } catch (e) {}
                }

                // Reset Counters & Metadata
                await adminDb.collection("counters").doc("students").set({ current: 0 }, { merge: true });
                await adminDb.collection("counters").doc("teachers").set({ current: 0 }, { merge: true });
                await adminDb.collection("counters").doc("staff").set({ current: 0 }, { merge: true });

                // RTDB Cleanup - Thorough
                try {
                    if (adminRtdb) {
                        await adminRtdb.ref().update({
                            analytics: null,
                            attendance: null,
                            realtime_notifications: null,
                            master: null,
                            teachers: null,
                            staff: null,
                            students: null,
                            timetables: null
                        });
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


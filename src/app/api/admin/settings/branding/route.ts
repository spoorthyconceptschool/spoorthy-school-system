import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb, adminStorage } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Role check
        if (decodedToken.role !== "SUPER_ADMIN" && decodedToken.role !== "ADMIN" && !decodedToken.email?.includes("admin")) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { schoolName, address, schoolLogo, principalSignature } = body;

        // --- FOOTPRINT CLEANUP: IDENTIFY AND DELETE OLD ASSETS ---
        const existingRef = adminDb.collection("settings").doc("branding");
        const existingSnap = await existingRef.get();
        const existingData = existingSnap.data() || {};
        const storageCleanupTasks: Promise<any>[] = [];

        // helper to extract relative path from firebase storage URL
        const extractPath = (url: string) => {
            if (!url || !url.includes("firebasestorage.googleapis.com")) return null;
            try {
                const parts = url.split("/o/")[1].split("?")[0];
                return decodeURIComponent(parts);
            } catch (e) { return null; }
        };

        // If logo changed and old one was a firebase file, nuke it
        if (schoolLogo && existingData.schoolLogo && schoolLogo !== existingData.schoolLogo) {
            const oldPath = extractPath(existingData.schoolLogo);
            if (oldPath) {
                console.log(`[Branding] Nuking old logo footprint: ${oldPath}`);
                // Try to delete from several possible buckets just in case
                const buckets = [
                    adminStorage.bucket(), // Default
                    adminStorage.bucket("spoorthy-school-live-55917.firebasestorage.app"),
                    adminStorage.bucket("spoorthy-school-live-55917.appspot.com")
                ];
                buckets.forEach(b => storageCleanupTasks.push(b.file(oldPath).delete().catch(() => { })));
            }
        }

        // Same for signature
        if (principalSignature && existingData.principalSignature && principalSignature !== existingData.principalSignature) {
            const oldPath = extractPath(existingData.principalSignature);
            if (oldPath) {
                console.log(`[Branding] Nuking old signature footprint: ${oldPath}`);
                const buckets = [
                    adminStorage.bucket(),
                    adminStorage.bucket("spoorthy-school-live-55917.firebasestorage.app"),
                    adminStorage.bucket("spoorthy-school-live-55917.appspot.com")
                ];
                buckets.forEach(b => storageCleanupTasks.push(b.file(oldPath).delete().catch(() => { })));
            }
        }

        const updateData = {
            schoolName: schoolName || "",
            address: address || "",
            schoolLogo: schoolLogo || "",
            principalSignature: principalSignature || "",
            updatedAt: new Date().toISOString()
        };

        // 2. Write to both Firestore (Audit/Source) and RTDB (Broadcast)
        // Parallelizing for speed
        const promises = [
            // Firestore
            adminDb.collection("settings").doc("branding").set(updateData, { merge: true }),
            // RTDB - Sync to both legacy and new locations
            adminRtdb.ref("master/branding").set(updateData),
            adminRtdb.ref("siteContent/branding").set(updateData),
            ...storageCleanupTasks
        ];

        await Promise.all(promises);

        return NextResponse.json({ success: true, message: "Branding updated successfully" });

    } catch (error: any) {
        console.error("[API Branding Update] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

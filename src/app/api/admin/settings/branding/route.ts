import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb, adminStorage } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get("Authorization");
        console.log("[Branding Route] received Authorization header:", authHeader ? authHeader.substring(0, 30) + "..." : "null/undefined");
        if (!authHeader?.startsWith("Bearer ")) {
            console.log("[Branding Route] Authorization header does not start with Bearer");
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        console.log("[Branding Route] Token value: '" + token + "' (length: " + (token ? token.length : 0) + ")");
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
            console.log("[Branding Route] Token verified successfully. UID:", decodedToken.uid, "Role:", decodedToken.role);
        } catch (authError: any) {
            console.error("[Branding Route] Token verification failed:", authError.message || authError);
            return NextResponse.json({ success: false, error: "Unauthorized: " + authError.message }, { status: 401 });
        }

        // Role check
        if (decodedToken.role !== "SUPER_ADMIN" && decodedToken.role !== "ADMIN" && !decodedToken.email?.includes("admin")) {
            console.log("[Branding Route] Role forbidden:", decodedToken.role, decodedToken.email);
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { schoolName, address, schoolLogo, principalSignature, studentIdPrefix, teacherIdPrefix, studentIdSuffix, teacherIdSuffix, branchId: providedBranchId } = body;

        // Determine target branch
        let targetBranchId = "global";
        if (decodedToken.role === "ADMIN") {
            targetBranchId = decodedToken.schoolId;
        } else if (decodedToken.role === "SUPER_ADMIN" && providedBranchId) {
            targetBranchId = providedBranchId;
        }

        // --- FOOTPRINT CLEANUP: IDENTIFY AND DELETE OLD ASSETS ---
        const storageCleanupTasks: Promise<any>[] = [];
        const extractPath = (url: string) => {
            if (!url || !url.includes("firebasestorage.googleapis.com")) return null;
            try {
                const parts = url.split("/o/")[1].split("?")[0];
                return decodeURIComponent(parts);
            } catch (e) { return null; }
        };

        const globalBrandingRef = adminDb.collection("settings").doc("branding");
        const globalSnap = await globalBrandingRef.get();
        const globalData = globalSnap.data() || {};

        if (schoolLogo && globalData.schoolLogo && schoolLogo !== globalData.schoolLogo) {
            const oldPath = extractPath(globalData.schoolLogo);
            if (oldPath) {
                const buckets = [adminStorage.bucket(), adminStorage.bucket("spoorthy-16292.firebasestorage.app"), adminStorage.bucket("spoorthy-16292.appspot.com")];
                buckets.forEach(b => storageCleanupTasks.push(b.file(oldPath).delete().catch(() => { })));
            }
        }

        // Branch update logic
        let branchData: any = {};
        if (targetBranchId && targetBranchId !== "global") {
            const branchRef = adminDb.collection("branches").doc(targetBranchId);
            const branchSnap = await branchRef.get();
            branchData = branchSnap.exists ? branchSnap.data() : {};

            if (principalSignature && branchData.principalSignature && principalSignature !== branchData.principalSignature) {
                const oldPath = extractPath(branchData.principalSignature);
                if (oldPath) {
                    const buckets = [adminStorage.bucket(), adminStorage.bucket("spoorthy-16292.firebasestorage.app"), adminStorage.bucket("spoorthy-16292.appspot.com")];
                    buckets.forEach(b => storageCleanupTasks.push(b.file(oldPath).delete().catch(() => { })));
                }
            }
            
            const branchUpdate = {
                schoolName: schoolName || branchData.schoolName || "",
                address: address || branchData.address || "",
                principalSignature: principalSignature || branchData.principalSignature || "",
                studentIdPrefix: studentIdPrefix || branchData.studentIdPrefix || "",
                teacherIdPrefix: teacherIdPrefix || branchData.teacherIdPrefix || "",
                studentIdSuffix: studentIdSuffix ? Number(studentIdSuffix) : (branchData.studentIdSuffix || 1),
                teacherIdSuffix: teacherIdSuffix ? Number(teacherIdSuffix) : (branchData.teacherIdSuffix || 1),
                updatedAt: new Date().toISOString()
            };
            await branchRef.set(branchUpdate, { merge: true });
        }

        const globalUpdate: any = { updatedAt: new Date().toISOString() };
        if (schoolLogo) globalUpdate.schoolLogo = schoolLogo;
        
        // If it's global edit or fallback
        if (targetBranchId === "global") {
            if (schoolName) globalUpdate.schoolName = schoolName;
            if (address) globalUpdate.address = address;
            if (principalSignature) globalUpdate.principalSignature = principalSignature;
            if (studentIdPrefix) globalUpdate.studentIdPrefix = studentIdPrefix;
            if (teacherIdPrefix) globalUpdate.teacherIdPrefix = teacherIdPrefix;
            if (studentIdSuffix) globalUpdate.studentIdSuffix = Number(studentIdSuffix);
            if (teacherIdSuffix) globalUpdate.teacherIdSuffix = Number(teacherIdSuffix);
        }

        const promises = [
            globalBrandingRef.set(globalUpdate, { merge: true }),
            adminRtdb.ref("master/branding").update(globalUpdate),
            adminRtdb.ref("siteContent/branding").update(globalUpdate),
            ...storageCleanupTasks
        ];

        await Promise.all(promises);

        return NextResponse.json({ success: true, message: "Settings updated successfully" });

    } catch (error: any) {
        console.error("[API Branding Update] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

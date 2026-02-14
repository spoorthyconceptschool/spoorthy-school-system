import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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
            // RTDB
            adminRtdb.ref("master/branding").update(updateData)
        ];

        await Promise.all(promises);

        return NextResponse.json({ success: true, message: "Branding updated successfully" });

    } catch (error: any) {
        console.error("[API Branding Update] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

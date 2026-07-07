import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function GET() {
    try {
        const email = "hss00003@school.local";
        const userRecord = await adminAuth.getUserByEmail(email);
        const uid = userRecord.uid;
        
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const studentDoc = await adminDb.collection("students").doc("HSS00003").get();
        
        return NextResponse.json({
            uid,
            userExists: userDoc.exists,
            userData: userDoc.exists ? userDoc.data() : null,
            studentExists: studentDoc.exists,
            studentData: studentDoc.exists ? { branchId: studentDoc.data()?.branchId, schoolId: studentDoc.data()?.schoolId } : null
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}

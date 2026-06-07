import { adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const branchesRef = adminDb.collection("branches");
        const defaultBranchSnapshot = await branchesRef.where("branchCode", "==", "MAIN").limit(1).get();
        
        if (!defaultBranchSnapshot.empty) {
            const doc = defaultBranchSnapshot.docs[0];
            await doc.ref.update({
                branchName: "Spoorthy High Branch",
                branchCode: "SHS",
                schoolName: "Spoorthy High School",
            });
            return NextResponse.json({ success: true, message: "Branch renamed to Spoorthy High Branch" });
        }
        return NextResponse.json({ error: "Main Campus not found" }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

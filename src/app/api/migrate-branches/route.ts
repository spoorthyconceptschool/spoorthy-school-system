import { adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

const COLLECTIONS_TO_MIGRATE = [
  "students", "teachers", "attendance", "fees", "exams", 
  "subjects", "classes", "sections", "documents", 
  "notifications", "reports", "auditLogs"
];

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        if (url.searchParams.get("secret") !== "SPOORTHY_MIGRATE_2026") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Create Default Branch
        const branchesRef = adminDb.collection("branches");
        const defaultBranchSnapshot = await branchesRef.where("branchCode", "==", "MAIN").limit(1).get();
        
        let defaultBranchId = "";
        
        if (defaultBranchSnapshot.empty) {
            const newBranchRef = branchesRef.doc();
            await newBranchRef.set({
                branchName: "Main Campus",
                branchCode: "MAIN",
                schoolName: "Spoorthy Concept School",
                email: "admin@spoorthy.edu",
                phone: "+91 0000000000",
                address: "Kanagal X Road",
                city: "Nalgonda",
                state: "Telangana",
                country: "India",
                pincode: "508001",
                principalName: "Admin",
                status: "ACTIVE",
                createdAt: new Date(),
                updatedAt: new Date()
            });
            defaultBranchId = newBranchRef.id;
        } else {
            defaultBranchId = defaultBranchSnapshot.docs[0].id;
        }

        let updatedCounts: Record<string, number> = {};

        // 2. Tag all business records with default branch
        for (const collectionName of COLLECTIONS_TO_MIGRATE) {
            let count = 0;
            const snapshot = await adminDb.collection(collectionName).get();
            
            const batch = adminDb.batch();
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (!data.branchId) {
                    batch.update(doc.ref, { branchId: defaultBranchId });
                    count++;
                }
            });
            
            if (count > 0) {
                await batch.commit();
            }
            updatedCounts[collectionName] = count;
        }

        // 3. Update existing admins to SUPER_ADMIN
        const usersSnapshot = await adminDb.collection("users").get();
        const userBatch = adminDb.batch();
        let userCount = 0;

        usersSnapshot.docs.forEach((doc) => {
            const userData = doc.data();
            const role = (userData.role || "").toUpperCase();
            if (role === "ADMIN" || role === "MANAGER" || role === "OWNER" || role === "DEVELOPER") {
                userBatch.update(doc.ref, { 
                    role: "SUPER_ADMIN",
                    branchId: null 
                });
                userCount++;
            }
        });

        if (userCount > 0) {
            await userBatch.commit();
        }
        updatedCounts["users"] = userCount;

        return NextResponse.json({
            success: true,
            defaultBranchId,
            updatedCounts
        });

    } catch (error: any) {
        console.error("Migration Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

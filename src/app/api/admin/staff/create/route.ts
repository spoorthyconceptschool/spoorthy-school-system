import { NextResponse } from "next/server";
import { getAdminAuth, adminDb, Timestamp } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const auth = getAdminAuth();
        if (!auth) return NextResponse.json({ error: "Auth service not initialized" }, { status: 500 });

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
        }

        const body = await req.json();
        const { roleId, roleName, roleCode, name, mobile, address, baseSalary, initialAdjustment, branchId: providedBranchId } = body;

        if (!roleCode || !name || !mobile) {
            return NextResponse.json({ error: "Role, Name, and Mobile required." }, { status: 400 });
        }

        // Resolve branch ID
        let resolvedBranchId = "global";
        if (decodedToken.role === "ADMIN") {
            resolvedBranchId = decodedToken.schoolId || "global";
        } else if (providedBranchId) {
            resolvedBranchId = providedBranchId;
        }

        // 1. Transaction: Role-based Counter & ID
        const result = await adminDb.runTransaction(async (t: any) => {
            const counterRef = adminDb.collection("counters").doc(resolvedBranchId !== "global" ? `staff_${roleCode}_${resolvedBranchId}` : `staff_${roleCode}`);
            const counterSnap = await t.get(counterRef);

            let newCount = 1;
            if (counterSnap.exists) {
                newCount = counterSnap.data()?.count + 1;
            }

            const paddedId = String(newCount).padStart(4, "0");
            const staffId = `${roleCode}${paddedId}`;

            // Calculate Salary
            let finalSalary = Number(baseSalary) || 0;

            // 2. Write Profile (No Auth User)
            const staffRef = adminDb.collection("staff").doc(staffId);
            t.set(staffRef, {
                schoolId: staffId,
                branchId: resolvedBranchId,
                name,
                mobile,
                address,
                roleId,
                roleName,
                roleCode,
                baseSalary: finalSalary,
                status: "ACTIVE",
                createdAt: Timestamp.now()
            });

            // Increment Counter
            t.set(counterRef, { count: newCount }, { merge: true });

            // Audit
            const auditRef = adminDb.collection("audit_logs").doc();
            t.set(auditRef, {
                action: "CREATE_STAFF",
                targetId: staffId,
                details: { name, role: roleCode },
                timestamp: Timestamp.now()
            });

            return { staffId };
        });

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("Create Staff Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

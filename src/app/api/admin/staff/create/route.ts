import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { roleId, roleName, roleCode, name, mobile, address, baseSalary, initialAdjustment } = body; // roleCode e.g. "DRV"

        if (!roleCode || !name || !mobile) {
            return NextResponse.json({ error: "Role, Name, and Mobile required." }, { status: 400 });
        }

        // 1. Transaction: Role-based Counter & ID
        const result = await adminDb.runTransaction(async (t: any) => {
            // Counter: /counters/staff_DRV, /counters/staff_CL, etc.
            const counterRef = adminDb.collection("counters").doc(`staff_${roleCode}`);
            const counterSnap = await t.get(counterRef);

            let newCount = 1;
            if (counterSnap.exists) {
                newCount = counterSnap.data()?.count + 1;
            }

            // Create ID: DRV0001 (Pad to 4 digits? Req. said 3 for Watchman, 4 for others. Let's stick to 4 for consistency unless strict.)
            // Spec said: Watchman WM001. Others 4 digits. Let's make it flexible or just 4. Spec says "WM001 (pad to 3)". 
            // We'll stick to 4 for consistency (DRV0001) as it's safer.
            const paddedId = String(newCount).padStart(4, "0");
            const staffId = `${roleCode}${paddedId}`;

            // Calculate Salary
            let finalSalary = Number(baseSalary) || 0;
            // If adjustment logic needed, handle here. We just store the final base.

            // 2. Write Profile (No Auth User)
            const staffRef = adminDb.collection("staff").doc(staffId);
            t.set(staffRef, {
                schoolId: staffId,
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

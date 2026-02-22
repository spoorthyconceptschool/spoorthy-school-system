import { NextResponse } from "next/server";
import { adminAuth, adminDb, Timestamp } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        // 1. Validate Admin (In a real app, check 'Authorization' header)
        // const authHeader = req.headers.get("Authorization");
        // const token = authHeader?.split("Bearer ")[1];
        // if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Body Parsings
        const body = await req.json();
        const { name, mobile, age, address, salary, qualifications, subjects, classTeacherOf } = body;

        if (!name || !mobile || mobile.length !== 10) {
            return NextResponse.json({ error: "Invalid Data: Name and 10-digit mobile required." }, { status: 400 });
        }

        // 2. Transaction for Atomic ID Generation (SHSTxxxx)
        const result = await adminDb.runTransaction(async (t: any) => {
            const counterRef = adminDb.collection("counters").doc("teachers");
            const counterSnap = await t.get(counterRef);

            let newCount = 1;
            if (counterSnap.exists) {
                newCount = counterSnap.data()?.count + 1;
            }

            // Padded ID: SHST0005
            const paddedId = String(newCount).padStart(4, "0");
            const teacherId = `SHST${paddedId}`;

            // 3. Create Firebase Auth User
            // Email: SHST0005@school.local
            // Pass: Mobile Number
            // Email: SHST0005@school.local
            // Pass: Mobile Number
            // Ensure email is lowercase to avoid Auth case-sensitivity issues
            const email = `${teacherId}@school.local`.toLowerCase();
            const password = mobile;

            let uid;
            try {
                const userRecord = await adminAuth.createUser({
                    email,
                    password,
                    displayName: name,
                    phoneNumber: `+91${mobile}`, // Enforce +91 for uniqueness if needed, or skip phone field in Auth if dupes worry
                });
                uid = userRecord.uid;
                await adminAuth.setCustomUserClaims(uid, { role: "TEACHER" });
            } catch (authError: any) {
                if (authError.code === 'auth/email-already-exists') {
                    // This is catastropic for our counter logic, strictly shouldn't happen if counter is atomic.
                    throw new Error("Critical: Teacher ID collision in Auth.");
                }
                throw authError;
            }

            // 4. Firestore Writes

            // Increment Counter
            t.set(counterRef, { count: newCount }, { merge: true });

            // Create Teacher Profile
            const teacherRef = adminDb.collection("teachers").doc(teacherId); // Doc ID = SHSTxxxx
            t.set(teacherRef, {
                schoolId: teacherId,
                uid,
                name,
                mobile,
                age,
                address,
                salary: Number(salary) || 0,
                qualifications,
                status: "ACTIVE",
                subjects: subjects || [], // Array of subject names or IDs
                classTeacherOf: classTeacherOf || null, // { className, sectionName }
                createdAt: Timestamp.now(),
                recoveryPassword: mobile // Shadow Password for Admin Visibility
            });

            // Role Mapping for Login
            const userRef = adminDb.collection("users").doc(uid);
            t.set(userRef, {
                schoolId: teacherId,
                role: "TEACHER",
                status: "ACTIVE",
                mustChangePassword: true, // Force change on first login
                createdAt: Timestamp.now(),
                recoveryPassword: mobile // Shadow Password
            });

            // Map by School ID (Optional, since doc ID IS school ID, but useful for lookups)
            const mapRef = adminDb.collection("usersBySchoolId").doc(teacherId);
            t.set(mapRef, {
                uid,
                role: "TEACHER"
            });

            // Audit Log
            const auditRef = adminDb.collection("audit_logs").doc();
            t.set(auditRef, {
                action: "CREATE_TEACHER",
                targetId: teacherId,
                details: { name, mobile },
                timestamp: Timestamp.now()
            });

            // G. Search Indexing
            const searchKeywords = new Set<string>();
            const addKeywords = (text: string) => {
                if (!text) return;
                const normalized = text.toLowerCase().trim();
                searchKeywords.add(normalized);
                const tokens = normalized.split(/\s+/);
                tokens.forEach(t => searchKeywords.add(t));
                tokens.forEach(token => {
                    for (let i = 2; i <= token.length; i++) {
                        searchKeywords.add(token.substring(0, i));
                    }
                });
            };
            addKeywords(name);
            addKeywords(teacherId);
            addKeywords(mobile);
            addKeywords("Teacher");

            const searchRef = adminDb.collection("search_index").doc(teacherId);
            t.set(searchRef, {
                id: teacherId,
                entityId: teacherId,
                type: "teacher",
                title: name,
                subtitle: `Teacher - ${mobile}`,
                url: `/admin/teachers`, // Assuming no dedicated page per teacher yet, or update later
                keywords: Array.from(searchKeywords),
                updatedAt: Timestamp.now()
            });

            return { teacherId, uid };
        }); // End Transaction

        // Notification (After Transaction)
        try {
            const { sendServerNotification } = await import("@/lib/server-notifications");
            await sendServerNotification({
                target: "ALL_ADMINS",
                title: "New Teacher Onboarded",
                message: `${name} has been added as a Teacher. ID: ${result.teacherId}`,
                type: "INFO",
                actionBy: "SYSTEM"
            });
        } catch (noteError) {
            console.error("Failed to send notification:", noteError);
        }

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("Create Teacher Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

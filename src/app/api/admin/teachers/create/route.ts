import { NextResponse } from "next/server";
import { adminAuth, adminDb, Timestamp } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        // 1. Verify Authorization & Decode Token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e: any) {
            return NextResponse.json({ error: "Unauthorized: " + e.message }, { status: 401 });
        }

        // Role check
        const allowedRoles = ["SUPER_ADMIN", "SUPERADMIN", "ADMIN", "OWNER", "DEVELOPER", "MANAGER"];
        if (!allowedRoles.includes(String(decodedToken.role || "").toUpperCase()) && !decodedToken.email?.includes("admin")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Body Parsings
        const body = await req.json();
        const { name, mobile, age, address, salary, qualifications, subjects, classTeacherOf, classTeacherOfList, subjectAssignments, branchId: providedBranchId } = body;

        if (!name || !mobile || mobile.length !== 10) {
            return NextResponse.json({ error: "Invalid Data: Name and 10-digit mobile required." }, { status: 400 });
        }

        // Resolve branch ID
        let resolvedBranchId = "global";
        if (decodedToken.role === "ADMIN") {
            resolvedBranchId = decodedToken.schoolId || "global";
        } else if (providedBranchId) {
            resolvedBranchId = providedBranchId;
        }

        // 2. Atomic ID Generation & Core Writes
        const result = await adminDb.runTransaction(async (t: any) => {
            const settingsRef = adminDb.collection("settings").doc("branding");
            const settingsSnap = await t.get(settingsRef);
            const brandingData = settingsSnap.data() || {};

            const branchRef = resolvedBranchId !== "global" ? adminDb.collection("branches").doc(resolvedBranchId) : null;
            const branchSnap = branchRef ? await t.get(branchRef) : null;
            const branchData = branchSnap?.exists ? branchSnap.data() : null;

            const prefix = branchData?.teacherIdPrefix || brandingData.teacherIdPrefix || "";
            const startingNumber = branchData?.teacherIdSuffix ? Number(branchData.teacherIdSuffix) : (brandingData.teacherIdSuffix ? Number(brandingData.teacherIdSuffix) : 1);

            const counterRef = adminDb.collection("counters").doc(resolvedBranchId !== "global" ? `teachers_${resolvedBranchId}` : "teachers");
            const counterSnap = await t.get(counterRef);

            let newCount = startingNumber;
            if (counterSnap.exists && counterSnap.data()?.count >= startingNumber) {
                newCount = counterSnap.data()?.count + 1;
            }

            const paddedId = String(newCount).padStart(4, "0");
            const teacherId = `${prefix}${paddedId}`;
            const email = `${teacherId}@school.local`.toLowerCase();

            // 3. Auth Creation
            const userRecord = await adminAuth.createUser({
                email,
                password: mobile,
                displayName: name,
                phoneNumber: `+91${mobile}`,
            });
            const uid = userRecord.uid;
            await adminAuth.setCustomUserClaims(uid, { role: "TEACHER" });

            // 4. Atomic Firestore Writes
            t.set(counterRef, { count: newCount }, { merge: true });
            
            t.set(adminDb.collection("teachers").doc(teacherId), {
                teacherId: teacherId,
                schoolId: resolvedBranchId,
                branchId: resolvedBranchId,
                uid,
                name,
                mobile,
                age,
                address,
                salary: Number(salary) || 0,
                qualifications,
                status: "ACTIVE",
                subjects: subjects || [],
                classTeacherOf: classTeacherOf || (classTeacherOfList?.[0] || null),
                classTeacherOfList: classTeacherOfList || (classTeacherOf ? [classTeacherOf] : []),
                createdAt: Timestamp.now(),
                recoveryPassword: mobile
            });

            t.set(adminDb.collection("users").doc(uid), {
                teacherId: teacherId,
                schoolId: resolvedBranchId,
                branchId: resolvedBranchId,
                role: "TEACHER",
                status: "ACTIVE",
                mustChangePassword: true,
                createdAt: Timestamp.now(),
                recoveryPassword: mobile
            });

            t.set(adminDb.collection("usersBySchoolId").doc(teacherId), { uid, role: "TEACHER" });

            return { teacherId, uid };
        });

        // --- ASYNCHRONOUS SIDE EFFECTS (OUTSIDE TRANSACTION) ---
        const backgroundTasks = [];

        // 1. Search Indexing
        const searchKeywords = new Set<string>();
        const addKeywords = (text: string) => {
            if (!text) return;
            const normalized = text.toLowerCase().trim();
            searchKeywords.add(normalized);
            normalized.split(/\s+/).forEach(token => {
                searchKeywords.add(token);
                for (let i = 2; i <= token.length; i++) searchKeywords.add(token.substring(0, i));
            });
        };
        addKeywords(name);
        addKeywords(result.teacherId);
        addKeywords(mobile);

        backgroundTasks.push(adminDb.collection("search_index").doc(result.teacherId).set({
            id: result.teacherId,
            entityId: result.teacherId,
            type: "teacher",
            title: name,
            subtitle: `Teacher - ${mobile}`,
            url: `/admin/teachers`,
            keywords: Array.from(searchKeywords),
            updatedAt: Timestamp.now()
        }));

        // 2. RTDB Sync
        const { adminRtdb } = require("@/lib/firebase-admin");
        
        // Sync class teacher roles list
        const activeClassTeacherList = classTeacherOfList || (classTeacherOf ? [classTeacherOf] : []);
        activeClassTeacherList.forEach((ctRole: any) => {
            if (ctRole?.classId && ctRole?.sectionId) {
                const csKey = `${ctRole.classId}_${ctRole.sectionId}`;
                backgroundTasks.push(adminRtdb.ref(`master/classSections/${csKey}`).update({
                    classId: ctRole.classId,
                    sectionId: ctRole.sectionId,
                    classTeacherId: result.teacherId,
                    classTeacherName: name,
                    active: true
                }));
            }
        });

        // Sync subject assignments list
        if (Array.isArray(subjectAssignments)) {
            subjectAssignments.forEach((assign: any) => {
                if (assign?.classId && assign?.sectionId && assign?.subId) {
                    const csKey = `${assign.classId}_${assign.sectionId}`;
                    backgroundTasks.push(adminRtdb.ref(`master/subjectTeachers/${csKey}`).update({
                        [assign.subId]: result.teacherId
                    }));
                }
            });
        }

        // 3. Notifications
        backgroundTasks.push((async () => {
            try {
                const { sendServerNotification } = await import("@/lib/server-notifications");
                await sendServerNotification({
                    target: "ALL_ADMINS",
                    title: "New Teacher Onboarded",
                    message: `${name} has been added. ID: ${result.teacherId}`,
                    type: "INFO",
                    actionBy: "SYSTEM"
                });
            } catch (e) {}
        })());

        // We don't await backgroundTasks to keep response time ultra-low
        // but we'll trigger them now. 
        Promise.all(backgroundTasks).catch(e => console.error("Post-Teacher-Creation Task Error:", e));

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("Create Teacher Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

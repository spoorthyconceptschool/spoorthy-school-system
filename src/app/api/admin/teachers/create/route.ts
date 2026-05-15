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

        // 2. Atomic ID Generation & Core Writes
        const result = await adminDb.runTransaction(async (t: any) => {
            const settingsRef = adminDb.collection("settings").doc("branding");
            const settingsSnap = await t.get(settingsRef);
            const brandingData = settingsSnap.data() || {};
            const prefix = brandingData.teacherIdPrefix || "SHST";
            const startingNumber = brandingData.teacherIdSuffix ? Number(brandingData.teacherIdSuffix) : 1;

            const counterRef = adminDb.collection("counters").doc("teachers");
            const counterSnap = await t.get(counterRef);

            let newCount = startingNumber;
            if (counterSnap.exists && counterSnap.data()?.count >= startingNumber) {
                newCount = counterSnap.data()?.count + 1;
            }

            const paddedId = String(newCount).padStart(4, "0");
            const teacherId = `${prefix}${paddedId}`;
            const email = `${teacherId}@school.local`.toLowerCase();

            // 3. Auth Creation (Must be in transaction to prevent ID reuse if auth fails, 
            // but we can't truly put it in a Firestore transaction. 
            // However, we'll keep it here as the 'point of no return')
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
                schoolId: teacherId,
                uid,
                name,
                mobile,
                age,
                address,
                salary: Number(salary) || 0,
                qualifications,
                status: "ACTIVE",
                subjects: subjects || [],
                classTeacherOf: classTeacherOf || null,
                createdAt: Timestamp.now(),
                recoveryPassword: mobile
            });

            t.set(adminDb.collection("users").doc(uid), {
                schoolId: teacherId,
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
        if (classTeacherOf?.classId && classTeacherOf?.sectionId) {
            const { adminRtdb } = require("@/lib/firebase-admin");
            const csKey = `${classTeacherOf.classId}_${classTeacherOf.sectionId}`;
            backgroundTasks.push(adminRtdb.ref(`master/classSections/${csKey}`).update({
                classId: classTeacherOf.classId,
                sectionId: classTeacherOf.sectionId,
                classTeacherId: result.teacherId,
                active: true
            }));
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

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("Create Teacher Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

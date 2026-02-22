import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb, Timestamp } from "@/lib/firebase-admin";

export const maxDuration = 300; // 5 minutes for a full ecosystem rebuild
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const logs: string[] = [];
    const startTime = Date.now();
    try {
        logs.push("Starting 'Ecosystem Master' Super Seed - Populating all modules...");

        if (!adminDb || !adminRtdb || !adminAuth) {
            return NextResponse.json({ success: false, error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const academicYearId = "2025-2026";
        const password = "password123";
        const mainBatch = adminDb.batch();

        // --- PHASE 1: MASTER REGISTRY (WIPE & REBUILD) ---
        logs.push("1. Performing FACTORY RESET and rebuilding Master Registry (Nursery-10)...");

        const villages = {
            "v1": { id: "v1", name: "Ameerpet", distance: 0 },
            "v2": { id: "v2", name: "Madhapur", distance: 5 },
            "v3": { id: "v3", name: "Kukatpally", distance: 8 },
            "v4": { id: "v4", name: "Jubilee Hills", distance: 4 },
            "v5": { id: "v5", name: "Banjara Hills", distance: 6 },
            "v6": { id: "v6", name: "Gachibowli", distance: 10 },
            "v7": { id: "v7", name: "Kondapur", distance: 12 },
            "v8": { id: "v8", name: "Hitech City", distance: 7 },
            "v9": { id: "v9", name: "Manikonda", distance: 15 },
            "v10": { id: "v10", name: "Miyapur", distance: 18 }
        };

        const classesList = [
            { id: "nursery", name: "Nursery", order: 1 }, { id: "lkg", name: "LKG", order: 2 }, { id: "ukg", name: "UKG", order: 3 },
            { id: "c1", name: "1st Class", order: 4 }, { id: "c2", name: "2nd Class", order: 5 }, { id: "c3", name: "3rd Class", order: 6 },
            { id: "c4", name: "4th Class", order: 7 }, { id: "c5", name: "5th Class", order: 8 }, { id: "c6", name: "6th Class", order: 9 },
            { id: "c7", name: "7th Class", order: 10 }, { id: "c8", name: "8th Class", order: 11 }, { id: "c9", name: "9th Class", order: 12 },
            { id: "c10", name: "10th Class", order: 13 }
        ];
        const classes: Record<string, any> = {}; classesList.forEach(c => classes[c.id] = c);

        const subjectsList = [
            { id: "sub_tel", name: "Telugu", code: "TEL", order: 1 },
            { id: "sub_hin", name: "Hindi", code: "HIN", order: 2 },
            { id: "sub_eng", name: "English", code: "ENG", order: 3 },
            { id: "sub_mat", name: "Mathematics", code: "MATH", order: 4 },
            { id: "sub_sci", name: "Science", code: "SCI", order: 5 },
            { id: "sub_soc", name: "Social Studies", code: "SOC", order: 6 },
            { id: "sub_com", name: "Computer", code: "COMP", order: 7 },
            { id: "sub_gk", name: "General Knowledge", code: "GK", order: 8 },
            { id: "sub_evs", name: "EVS", code: "EVS", order: 9 },
            { id: "sub_phy", name: "Physical Education", code: "PET", order: 10 }
        ];
        const subjects: Record<string, any> = {}; subjectsList.forEach(s => subjects[s.id] = s);

        const sections = { "s_a": { id: "s_a", name: "Section A" }, "s_b": { id: "s_b", name: "Section B" } };

        const staffPool = [
            { id: "T101", name: "Anjali Devi", email: "anjali@school.local", role: "TEACHER", subjects: ["sub_tel"] },
            { id: "T102", name: "Ramesh Kumar", email: "ramesh@school.local", role: "TEACHER", subjects: ["sub_mat"] },
            { id: "T103", name: "Sarah Wilson", email: "sarah@school.local", role: "TEACHER", subjects: ["sub_eng"] },
            { id: "T104", name: "Vikram Seth", email: "vikram@school.local", role: "TEACHER", subjects: ["sub_sci"] },
            { id: "T105", name: "Kiran Goud", email: "kiran@school.local", role: "TEACHER", subjects: ["sub_soc"] },
            { id: "T106", name: "Latha Reddy", email: "latha@school.local", role: "TEACHER", subjects: ["sub_hin"] },
            { id: "T107", name: "Prakash Jha", email: "prakash@school.local", role: "TEACHER", subjects: ["sub_phy"] },
            { id: "T108", name: "Sumati Rao", email: "sumati@school.local", role: "TEACHER", subjects: ["sub_com"] },
            { id: "admin@school.local", name: "Super Admin", email: "admin@school.local", role: "ADMIN", subjects: [] }
        ];

        const classSections: Record<string, any> = {};
        const subjectTeachers: Record<string, any> = {};
        const classSubjects: Record<string, any> = {};

        classesList.forEach((c, cIdx) => {
            const subMap: Record<string, boolean> = {};
            subjectsList.forEach(s => subMap[s.id] = true);
            classSubjects[c.id] = subMap;

            ["s_a", "s_b"].forEach((sId, sIdx) => {
                const csKey = `${c.id}_${sId}`;
                const classTeacher = staffPool[(cIdx * 2 + sIdx) % staffPool.length];

                classSections[csKey] = {
                    classId: c.id,
                    sectionId: sId,
                    classTeacherId: classTeacher.id,
                    maxStrength: 40
                };

                const mapping: Record<string, string> = {};
                subjectsList.forEach((sub, subIdx) => {
                    const teacher = staffPool[(cIdx + subIdx) % staffPool.length];
                    mapping[sub.id] = teacher.id;
                });
                subjectTeachers[csKey] = mapping;
            });
        });

        const branding = {
            schoolName: "Spoorthy Concept School",
            address: "Main Campus, Hyderabad",
            schoolLogo: "https://firebasestorage.googleapis.com/v0/b/spoorthy-school-live-55917.firebasestorage.app/o/demo%2Flogo.png?alt=media"
        };

        // FORCE SET RTDB (WIPES OLD DATA)
        await adminRtdb.ref("master").set({
            villages, classes, sections, subjects, classSections, classSubjects, subjectTeachers, branding,
            homeworkSubjects: {}, roles: {}
        });

        // Sync to Firestore for legacy dependencies (FORCE OVERWRITE)
        logs.push("... Overwriting Firestore Cache with clean data...");
        Object.entries(classes).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_classes").doc(id), { ...data, updatedAt: Timestamp.now() }));
        Object.entries(villages).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_villages").doc(id), { ...data, updatedAt: Timestamp.now() }));
        Object.entries(subjects).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_subjects").doc(id), { ...data, updatedAt: Timestamp.now() }));
        Object.entries(sections).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_sections").doc(id), { ...data, updatedAt: Timestamp.now() }));

        // CMS Content
        logs.push("... Initializing Website CMS Content...");
        const homeContent = {
            hero: { title: "Education for Tomorrow.", subtitle: "Innovation meets tradition.", videoUrl: "" },
            facilities: {
                digital_classrooms: { title: "Smart Classes", desc: "Interactive boards.", order: 1, isPublished: true },
                professional_teachers: { title: "Expert Faculty", desc: "Experienced mentors.", order: 2, isPublished: true }
            }
        };
        await adminRtdb.ref("siteContent/home").set(homeContent);

        // Staff Accounts
        logs.push("... Creating Faculty Accounts...");
        for (const p of staffPool) {
            let uid;
            try {
                const user = await adminAuth.createUser({ email: p.email, password, displayName: p.name });
                uid = user.uid;
                await adminAuth.setCustomUserClaims(uid, { role: p.role });
            } catch (e: any) {
                if (e.code === 'auth/email-already-exists') {
                    const user = await adminAuth.getUserByEmail(p.email);
                    uid = user.uid;
                } else throw e;
            }
            mainBatch.set(adminDb.collection("teachers").doc(p.id), {
                name: p.name, schoolId: p.id, uid, email: p.email, status: "ACTIVE", role: p.role,
                subjects: (p as any).subjects || [], createdAt: Timestamp.now()
            });
            mainBatch.set(adminDb.collection("users").doc(uid), { schoolId: p.id, role: p.role, status: "ACTIVE", displayName: p.name, email: p.email });
        }

        // Students (Sample)
        logs.push("... Enrolling Sample Students...");
        const studentList = [
            { id: "S1001", name: "Vihaan Kumar", email: "vihaan@school.local", classId: "c1", sectionId: "s_a" },
            { id: "S1002", name: "Ananya Pillai", email: "ananya@school.local", classId: "c1", sectionId: "s_a" }
        ];

        for (const s of studentList) {
            let uid;
            try {
                const user = await adminAuth.createUser({ email: s.email, password, displayName: s.name });
                uid = user.uid;
                await adminAuth.setCustomUserClaims(uid, { role: "STUDENT" });
            } catch (e: any) {
                if (e.code === 'auth/email-already-exists') {
                    const user = await adminAuth.getUserByEmail(s.email);
                    uid = user.uid;
                } else throw e;
            }
            mainBatch.set(adminDb.collection("students").doc(s.id), {
                studentName: s.name, schoolId: s.id, uid, classId: s.classId, sectionId: s.sectionId,
                status: "ACTIVE", createdAt: Timestamp.now()
            });
            mainBatch.set(adminDb.collection("users").doc(uid), { schoolId: s.id, role: "STUDENT", status: "ACTIVE", displayName: s.name, email: s.email });
        }

        await mainBatch.commit();
        const duration = (Date.now() - startTime) / 1000;
        logs.push(`SUCCESS: Ecosystem rebuild in ${duration}s.`);
        return NextResponse.json({ success: true, message: "Factory Reset Complete", logs });

    } catch (error: any) {
        console.error("Super Seed Error:", error);
        return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });
    }
}

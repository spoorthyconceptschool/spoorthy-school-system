import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb, Timestamp } from "@/lib/firebase-admin";
import { syncAllStudentLedgersAdmin } from "@/lib/services/fee-service-admin";

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

        // --- PHASE 1: MASTER REGISTRY ---
        logs.push("1. Rebuilding Master Registry (Villages, Classes, Subjects)...");

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
            { id: "sub_com", name: "Computer", code: "COMP", order: 7 }
        ];
        const subjects: Record<string, any> = {}; subjectsList.forEach(s => subjects[s.id] = s);
        const sections = { "s_a": { id: "s_a", name: "Section A" }, "s_b": { id: "s_b", name: "Section B" } };

        // --- PHASE 2: TEACHERS & SALARIES ---
        logs.push("2. Creating Faculty with Detailed Profiles and Salaries...");
        const staffPool = [
            { id: "T101", name: "Anjali Devi", email: "anjali@school.local", role: "TEACHER", subjects: ["sub_tel"], salary: 25000, phone: "9876543210" },
            { id: "T102", name: "Ramesh Kumar", email: "ramesh@school.local", role: "TEACHER", subjects: ["sub_mat"], salary: 28000, phone: "9876543211" },
            { id: "T103", name: "Sarah Wilson", email: "sarah@school.local", role: "TEACHER", subjects: ["sub_eng"], salary: 26500, phone: "9876543212" },
            { id: "T104", name: "Vikram Seth", email: "vikram@school.local", role: "TEACHER", subjects: ["sub_sci"], salary: 27000, phone: "9876543213" },
            { id: "T105", name: "Kiran Goud", email: "kiran@school.local", role: "TEACHER", subjects: ["sub_soc"], salary: 24000, phone: "9876543214" },
            { id: "T106", name: "Latha Reddy", email: "latha@school.local", role: "TEACHER", subjects: ["sub_hin"], salary: 24500, phone: "9876543215" },
            { id: "T107", name: "Prakash Jha", email: "prakash@school.local", role: "TEACHER", subjects: ["sub_phy"], salary: 22000, phone: "9876543216" },
            { id: "T108", name: "Sumati Rao", email: "sumati@school.local", role: "TEACHER", subjects: ["sub_com"], salary: 23000, phone: "9876543217" },
            { id: "admin@school.local", name: "Super Admin", email: "admin@school.local", role: "ADMIN", subjects: [], salary: 50000, phone: "9999999999" }
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
                const classTeacher = staffPool[(cIdx * 2 + sIdx) % (staffPool.length - 1)];
                classSections[csKey] = { classId: c.id, sectionId: sId, classTeacherId: classTeacher.id, maxStrength: 40 };

                const mapping: Record<string, string> = {};
                subjectsList.forEach((sub, subIdx) => {
                    const teacher = staffPool[(cIdx + subIdx) % (staffPool.length - 1)];
                    mapping[sub.id] = teacher.id;
                });
                subjectTeachers[csKey] = mapping;
            });
        });

        // --- PHASE 3: FEE CONFIGURATION ---
        logs.push("3. Setting up Fee Structures and Transport Fees...");
        const feeConfig = {
            terms: [
                { id: "t1", name: "Term 1 (Admission + First Term)", dueDate: "2025-06-15", isActive: true, amounts: {} as any },
                { id: "t2", name: "Term 2", dueDate: "2025-10-15", isActive: true, amounts: {} as any },
                { id: "t3", name: "Term 3", dueDate: "2026-01-15", isActive: true, amounts: {} as any }
            ],
            transportFees: { "v1": 0, "v2": 5000, "v3": 8000, "v4": 4000, "v5": 6000, "v6": 10000, "v7": 12000, "v8": 7000, "v9": 15000, "v10": 18000 }
        };

        classesList.forEach(c => {
            const base = (c.order < 4) ? 10000 : (c.order < 9) ? 15000 : 20000;
            feeConfig.terms[0].amounts[c.name] = base + 5000; // Admission fee in term 1
            feeConfig.terms[1].amounts[c.name] = base;
            feeConfig.terms[2].amounts[c.name] = base;
        });

        // --- PHASE 4: TIMETABLES ---
        logs.push("4. Generating Automatic Timetables for all Sections...");
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const periods = ["09:00", "10:00", "11:00", "12:00", "01:30", "02:30", "03:30"];

        for (const csKey of Object.keys(classSections)) {
            const timetable: any = {};
            days.forEach(day => {
                timetable[day] = periods.map((time, idx) => ({
                    time,
                    subjectId: subjectsList[idx % subjectsList.length].id,
                    teacherId: subjectTeachers[csKey][subjectsList[idx % subjectsList.length].id] || staffPool[0].id
                }));
            });
            await adminRtdb.ref(`timetables/${csKey}`).set(timetable);
        }

        // --- PHASE 5: SAVE TO DATABASE ---
        logs.push("5. Saving Master Data and CMS Content...");
        const existingMaster = await adminRtdb.ref("master").once("value");
        const existingSite = await adminRtdb.ref("siteContent/home").once("value");

        const branding = {
            schoolName: "Spoorthy Concept School",
            address: "Main Campus, Hyderabad",
            ...(existingMaster.child("branding").val() || {}),
            schoolLogo: (existingMaster.child("branding/schoolLogo").val()) || "https://firebasestorage.googleapis.com/v0/b/spoorthy-school-live-55917.firebasestorage.app/o/demo%2Flogo.png?alt=media"
        };

        await adminRtdb.ref("master").set({ villages, classes, sections, subjects, classSections, classSubjects, subjectTeachers, branding });
        await adminDb.collection("config").doc("fees").set(feeConfig);
        await adminDb.collection("config").doc("academic_years").set({
            currentYear: "2025-2026",
            currentYearStartDate: "2025-06-01",
            upcoming: ["2026-2027"],
            history: []
        });

        // Sync to Firestore
        Object.entries(classes).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_classes").doc(id), { ...data, updatedAt: Timestamp.now() }));
        Object.entries(villages).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_villages").doc(id), { ...data, updatedAt: Timestamp.now() }));

        // CMS
        await adminRtdb.ref("siteContent/home").set({
            hero: { title: "Education for Tomorrow.", subtitle: "Innovation meets tradition.", ...(existingSite.child("hero").val() || {}) },
            facilities: { ...(existingSite.child("facilities").val() || {}) }
        });

        // Staff
        logs.push("... Creating Faculty Access...");
        for (const p of staffPool) {
            let uid;
            try {
                const user = await adminAuth.createUser({ email: p.email, password, displayName: p.name });
                uid = user.uid;
                await adminAuth.setCustomUserClaims(uid, { role: p.role });
            } catch (e: any) {
                if (e.code === 'auth/email-already-exists') uid = (await adminAuth.getUserByEmail(p.email)).uid;
                else throw e;
            }
            mainBatch.set(adminDb.collection("teachers").doc(p.id), {
                name: p.name, schoolId: p.id, uid, email: p.email, status: "ACTIVE", role: p.role, salary: p.salary, mobile: p.phone,
                subjects: p.subjects, createdAt: Timestamp.now()
            });
            mainBatch.set(adminDb.collection("users").doc(uid), { schoolId: p.id, role: p.role, status: "ACTIVE", displayName: p.name, email: p.email });
        }

        // --- PHASE 6: MASSIVE STUDENT SEED ---
        logs.push("6. Enrolling 50+ Students across all sections...");
        const firstNames = ["Rahul", "Sanya", "Arjun", "Ishani", "Aarav", "Priya", "Vikram", "Neha", "Karthik", "Riya"];
        const lastNames = ["Reddy", "Goud", "Sharma", "Varma", "Patil", "Deshmukh", "Pillai", "Jain", "Iyer", "Khan"];

        for (let i = 1; i <= 52; i++) {
            const studentId = `S2025${String(i).padStart(4, '0')}`;
            const firstName = firstNames[i % firstNames.length];
            const lastName = lastNames[Math.floor(i / 5) % lastNames.length];
            const fullName = `${firstName} ${lastName}`;
            const classIdx = Math.floor((i - 1) / 4); // 4 students per class
            const targetClass = classesList[Math.min(classIdx, classesList.length - 1)];
            const targetSection = i % 2 === 0 ? "s_a" : "s_b";
            const villageId = `v${(i % 10) + 1}`;

            mainBatch.set(adminDb.collection("students").doc(studentId), {
                studentName: fullName, schoolId: studentId, admissionNo: studentId,
                classId: targetClass.id, className: targetClass.name, sectionId: targetSection,
                parentName: `${lastName} Senior`, parentMobile: `900000${String(i).padStart(4, '0')}`,
                villageId, villageName: villages[villageId as keyof typeof villages].name,
                transportRequired: i % 3 === 0, status: "ACTIVE", createdAt: Timestamp.now()
            });
        }

        logs.push("... Committing Firestore Batch...");
        await mainBatch.commit();

        // Final Step: Sync all student ledgers to initialize their fees
        const updatedLedgers = await syncAllStudentLedgersAdmin();
        logs.push(`7. Initialized ${updatedLedgers} student fee ledgers.`);

        const duration = (Date.now() - startTime) / 1000;
        logs.push(`SUCCESS: Comprehensive seed complete in ${duration}s.`);
        return NextResponse.json({ success: true, message: "Ecosystem Fully Populated", logs });

    } catch (error: any) {
        console.error("Super Seed Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ success: false, error: errorMessage, logs: logs.slice(-50) }, { status: 500 });
    }
}

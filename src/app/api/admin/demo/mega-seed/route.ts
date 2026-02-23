import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb, Timestamp } from "@/lib/firebase-admin";
import { syncAllStudentLedgersAdmin } from "@/lib/services/fee-service-admin";

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const logs: string[] = [];
    const startTime = Date.now();
    try {
        logs.push("🚀 Starting MEGA SEED - Generating 2000+ Students and Full Exam Year...");

        if (!adminDb || !adminRtdb || !adminAuth) {
            return NextResponse.json({ success: false, error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const academicYearId = "2025-2026";
        const password = "password123";

        // --- PHASE 1: MASTER DATA ---
        logs.push("1. Rebuilding Master Data (Villages, Classes, Subjects)...");

        const villages = {
            "v1": { id: "v1", name: "Village Alpha", distance: 2 },
            "v2": { id: "v2", name: "Village Beta", distance: 5 },
            "v3": { id: "v3", name: "Village Gamma", distance: 8 },
            "v4": { id: "v4", name: "Village Delta", distance: 4 },
            "v5": { id: "v5", name: "Village Epsilon", distance: 12 },
            "v6": { id: "v6", name: "Village Zeta", distance: 15 },
            "v7": { id: "v7", name: "Village Eta", distance: 20 },
            "v8": { id: "v8", name: "Village Theta", distance: 3 },
            "v9": { id: "v9", name: "Village Iota", distance: 7 },
            "v10": { id: "v10", name: "Village Kappa", distance: 10 }
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

        // --- PHASE 2: FACULTY ---
        logs.push("2. Creating Faculty Pool (15 Teachers)...");
        const teacherNames = ["V. Ananya", "K. Sunil", "S. Mahesh", "P. Kavita", "R. Suresh", "J. Laxmi", "B. Vikram", "M. Swapna", "G. Naveen", "A. Rekha", "K. Prasad", "S. Vanaja", "D. Rahul", "T. Divya", "N. Harish"];
        const staffPool = teacherNames.map((name, i) => ({
            id: `T${101 + i}`,
            name,
            email: `${name.toLowerCase().replace(' ', '.')}@school.local`,
            role: "TEACHER",
            subjects: [subjectsList[i % subjectsList.length].id],
            salary: 20000 + (i * 1000),
            phone: `9100000${100 + i}`
        }));
        staffPool.push({ id: "admin@school.local", name: "Principal Administrator", email: "admin@school.local", role: "ADMIN", subjects: [], salary: 60000, phone: "9999999999" });

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
                classSections[csKey] = { classId: c.id, sectionId: sId, classTeacherId: classTeacher.id, maxStrength: 100, active: true };

                const mapping: Record<string, string> = {};
                subjectsList.forEach((sub, subIdx) => {
                    const teacher = staffPool[(cIdx + subIdx) % (staffPool.length - 1)];
                    mapping[sub.id] = teacher.id;
                });
                subjectTeachers[csKey] = mapping;
            });
        });

        await adminRtdb.ref("master").set({ villages, classes, sections, subjects, classSections, classSubjects, subjectTeachers, branding: { schoolName: "Spoorthy Concept School", address: "Hyderabad Campus" } });

        // --- PHASE 3: FEE CONFIG ---
        logs.push("3. Configuring Fees (Terms, Transport, Custom)...");
        const feeConfig = {
            terms: [
                { id: "term1", name: "Term 1 (Admission)", dueDate: "2025-06-15", isActive: true, amounts: {} as any },
                { id: "term2", name: "Term 2", dueDate: "2025-10-15", isActive: true, amounts: {} as any },
                { id: "term3", name: "Term 3", dueDate: "2026-01-15", isActive: true, amounts: {} as any }
            ],
            transportFees: { "v1": 2000, "v2": 4000, "v3": 6000, "v4": 3000, "v5": 8000, "v6": 10000, "v7": 12000, "v8": 2500, "v9": 5000, "v10": 7000 }
        };

        classesList.forEach(c => {
            const base = 10000 + (c.order * 1000);
            feeConfig.terms[0].amounts[c.name] = base + 3000;
            feeConfig.terms[1].amounts[c.name] = base;
            feeConfig.terms[2].amounts[c.name] = base;
        });
        await adminDb.collection("config").doc("fees").set(feeConfig);

        // Custom Fees
        const customBatch = adminDb.batch();
        const customFees = [
            { id: "exam_fee", name: "Annual Exam Fee", amount: 1500, dueDate: "2026-02-01", targetType: "CLASS", targetIds: classesList.map(c => c.id), status: "ACTIVE" },
            { id: "event_fee", name: "School Day Celebration", amount: 500, dueDate: "2025-12-10", targetType: "VILLAGE", targetIds: ["v1", "v2", "v3", "v8"], status: "ACTIVE" }
        ];
        customFees.forEach(cf => customBatch.set(adminDb.collection("custom_fees").doc(cf.id), cf));
        await customBatch.commit();

        // --- PHASE 4: STUDENTS ---
        logs.push("4. Generating 2000 Students (using batch commits)...");
        const fNames = ["Aarav", "Vihaan", "Aditya", "Arjun", "Sai", "Ishaan", "Aaryan", "Krishna", "Rohan", "Kartik", "Ananya", "Diya", "Isha", "Kavya", "Myra", "Saanvi", "Priya", "Riya", "Tanvi", "Zoya"];
        const lNames = ["Reddy", "Goud", "Sharma", "Varma", "Patel", "Deshmukh", "Chowdhary", "Iyer", "Jain", "Khan"];

        let batch = adminDb.batch();
        let bCount = 0;
        const totalStudents = 2000;

        for (let i = 1; i <= totalStudents; i++) {
            const sid = `S2025${String(i).padStart(4, '0')}`;
            const fn = fNames[i % fNames.length];
            const ln = lNames[Math.floor(i / 3) % lNames.length];
            const clObj = classesList[i % classesList.length];
            const sec = i % 2 === 0 ? "s_a" : "s_b";
            const vId = `v${(i % 10) + 1}`;

            batch.set(adminDb.collection("students").doc(sid), {
                studentName: `${fn} ${ln}`, schoolId: sid, admissionNo: sid,
                classId: clObj.id, className: clObj.name, sectionId: sec, sectionName: sections[sec as keyof typeof sections].name,
                parentName: `${ln} Parent`, parentMobile: `9${String(i).padStart(9, '0')}`,
                villageId: vId, villageName: villages[vId as keyof typeof villages].name,
                transportRequired: i % 4 !== 0, status: "ACTIVE", rollNo: String((Math.floor(i / 26) % 50) + 1),
                createdAt: Timestamp.now()
            });

            bCount++;
            if (bCount >= 450) {
                await batch.commit();
                batch = adminDb.batch();
                bCount = 0;
            }
        }
        if (bCount > 0) await batch.commit();
        logs.push(`... Created ${totalStudents} students.`);

        // --- PHASE 5: EXAMS & MARKS ---
        logs.push("5. Creating 5 Exams & Generating Marks (10k Result Docs)...");
        const exams = [
            { id: "ut1", name: "Unit Test - I", startDate: "2025-07-10", endDate: "2025-07-15", status: "RESULTS_RELEASED" },
            { id: "qly", name: "Quarterly Exams", startDate: "2025-09-20", endDate: "2025-09-30", status: "RESULTS_RELEASED" },
            { id: "ut2", name: "Unit Test - II", startDate: "2025-11-05", endDate: "2025-11-10", status: "RESULTS_RELEASED" },
            { id: "hly", name: "Half Yearly Exams", startDate: "2025-12-15", endDate: "2025-12-24", status: "RESULTS_RELEASED" },
            { id: "ann", name: "Annual Examinations", startDate: "2026-03-20", endDate: "2026-03-31", status: "ACTIVE" }
        ];

        for (const ex of exams) {
            await adminDb.collection("exams").doc(ex.id).set({ ...ex, createdAt: Timestamp.now() });
        }

        // Generate Marks - This is a bit heavy, let's optimize
        // 2000 students * 5 exams = 10,000 docs.
        // We'll iterate students and for each student, create docs for all 5 exams.

        batch = adminDb.batch();
        bCount = 0;
        let markCount = 0;

        for (let i = 1; i <= totalStudents; i++) {
            const sid = `S2025${String(i).padStart(4, '0')}`;
            const fn = fNames[i % fNames.length];
            const ln = lNames[Math.floor(i / 3) % lNames.length];
            const clObj = classesList[i % classesList.length];
            const sec = i % 2 === 0 ? "s_a" : "s_b";

            for (const ex of exams) {
                const markId = `${ex.id}_${sid}`;
                const resRef = adminDb.collection("exam_results").doc(markId);

                const subjectsMark: Record<string, any> = {};
                subjectsList.forEach(s => {
                    const obtained = Math.floor(Math.random() * 60) + 40; // 40 to 100
                    subjectsMark[s.id] = { obtained: String(obtained), maxMarks: "100", remarks: obtained > 90 ? "Excellent" : "Good" };
                });

                batch.set(resRef, {
                    examId: ex.id, studentId: sid, studentName: `${fn} ${ln}`,
                    classId: clObj.id, className: clObj.name, sectionId: sec, sectionName: sections[sec as keyof typeof sections].name,
                    subjects: subjectsMark, updatedAt: Timestamp.now()
                });

                bCount++;
                markCount++;

                if (bCount >= 450) {
                    await batch.commit();
                    batch = adminDb.batch();
                    bCount = 0;
                }
            }
        }
        if (bCount > 0) await batch.commit();
        logs.push(`... Generated ${markCount} result documents.`);

        // --- PHASE 6: LEDGERS ---
        logs.push("6. Syncing Financial Ledgers...");
        const syncCount = await syncAllStudentLedgersAdmin();
        logs.push(`... Synchronized ${syncCount} ledgers.`);

        const duration = (Date.now() - startTime) / 1000;
        logs.push(`✅ MEGA SEED COMPLETE! Total Time: ${duration}s`);

        return NextResponse.json({ success: true, logs });

    } catch (e: any) {
        console.error("Mega Seed Error:", e);
        return NextResponse.json({ success: false, error: e.message, logs }, { status: 500 });
    }
}

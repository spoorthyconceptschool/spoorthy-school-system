import { adminDb, adminRtdb, FieldValue, Timestamp } from "@/lib/firebase-admin";

/**
 * Enterprise Demo Data Seeding Script (SERVER SIDE ONLY)
 * Optimized for Firebase Admin SDK.
 * Generates a full ecosystem for testing:
 * - 200 Students (10 per section, 2 sections, 10 classes)
 * - Master Data (Villages, Classes, Sections) - Both Firestore & RTDB
 * - Financial Data (Fee Ledgers, Payments)
 * - HR Data (Teachers, Leaves)
 * - Operational Data (Admissions, Search Index)
 * - Config (Academic Years, System Constants)
 */
export const seedDemoData = async () => {
    console.log("[Seeding] Initiating server-side ecosystem rebuild...");

    // Helper to delete all docs in a collection using Admin SDK
    const nukeCollection = async (collectionName: string) => {
        const ref = adminDb.collection(collectionName);
        try {
            // @ts-ignore
            if (adminDb.recursiveDelete) {
                // @ts-ignore
                await adminDb.recursiveDelete(ref);
            } else {
                // Manual chunked delete for environments/versions without recursiveDelete
                while (true) {
                    const snap = await ref.limit(500).get();
                    if (snap.empty) break;
                    const batch = adminDb.batch();
                    snap.docs.forEach((d: any) => batch.delete(d.ref));
                    await batch.commit();
                    if (snap.size < 500) break;
                }
            }
        } catch (e) {
            console.warn(`[Seeding] Could not purge ${collectionName}:`, e);
        }
    };

    console.log("[Seeding] Purging old data...");
    const coreCols = [
        "students", "master_villages", "master_classes", "master_sections", "master_class_sections",
        "payments", "applications", "leaves", "teachers", "staff", "student_fee_ledgers", "search_index", "notices"
    ];
    for (const col of coreCols) {
        await nukeCollection(col);
    }

    const firstNames = ["Aarav", "Advait", "Akash", "Anay", "Arjun", "Aryan", "Ayaan", "Dhruv", "Ishaan", "Kabir", "Madhav", "Reyansh", "Rudra", "Sai", "Shaurya", "Siddharth", "Tejas", "Vasudev", "Vihaan", "Viraj", "Aadhya", "Ananya", "Anvi", "Avni", "Diya", "Ira", "Ishani", "Kavya", "Myra", "Navya", "Priya", "Riya", "Saanvi", "Sara", "Shanaya", "Siya", "Tanvi", "Vanya", "Zoya"];
    const lastNames = ["Sharma", "Verma", "Gupta", "Malhotra", "Kapoor", "Khanna", "Mehra", "Joshi", "Patel", "Shah", "Desai", "Goel", "Agarwal", "Reddy", "Yadav", "Singh", "Choudhary", "Rao", "Nair", "Iyer"];
    const fatherNames = ["Vikram", "Suresh", "Rajeev", "Amit", "Manish", "Sanjay", "Vishnu", "Ramesh", "Kiran", "Prasad", "Basavaraj", "Mallikarjun", "Somesh", "Venkatesh"];
    const villageNames = ["Miyapur", "Bachupally", "Nizampet", "Kukatpally", "Hyder Nagar", "Pragathi Nagar", "Beeramguda", "Ameenpur", "Patancheru", "Kondapur"];
    const genders = ["male", "female"];

    const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const academicYearId = "2026-2027";

    const rtdbMaster: any = {
        villages: {},
        classes: {},
        sections: {},
        classSections: {},
        subjects: {
            "math": { id: "math", name: "Mathematics", isActive: true },
            "science": { id: "science", name: "Science", isActive: true },
            "english": { id: "english", name: "English", isActive: true }
        }
    };

    let batch = adminDb.batch();
    let opCount = 0;

    const commitBatch = async () => {
        if (opCount > 0) {
            await batch.commit();
            batch = adminDb.batch();
            opCount = 0;
        }
    };

    const addOp = async (ref: any, data: any) => {
        batch.set(ref, data, { merge: true });
        opCount++;
        if (opCount === 450) await commitBatch();
    };

    // 0. Academic Config
    await addOp(adminDb.collection("config").doc("academic_years"), {
        currentYear: academicYearId,
        currentYearStartDate: "2026-06-01",
        upcoming: ["2027-2028"],
        history: [{ year: "2025-2026", startDate: "2025-06-01", archivedAt: Timestamp.now() }]
    });

    // 1. Villages
    const villageIds: string[] = [];
    for (const [i, name] of villageNames.entries()) {
        const id = `VIL_${String(i + 1).padStart(3, '0')}`;
        villageIds.push(id);
        const data = { id, name, isActive: true, createdAt: Timestamp.now() };
        await addOp(adminDb.collection("master_villages").doc(id), data);
        rtdbMaster.villages[id] = data;
    }

    // 2. Classes & Sections
    const classData: { id: string, name: string }[] = [];
    for (let i = 1; i <= 10; i++) {
        const id = `CLS_${String(i).padStart(2, '0')}`;
        const name = i === 1 ? "Nursery" : i === 2 ? "LKG" : i === 3 ? "UKG" : `Class ${i - 3}`;
        classData.push({ id, name });
        const data = { id, name, isActive: true, order: i, createdAt: Timestamp.now() };
        await addOp(adminDb.collection("master_classes").doc(id), data);
        rtdbMaster.classes[id] = data;
    }

    const sections = [
        { id: "SEC_A", name: "A" },
        { id: "SEC_B", name: "B" }
    ];
    for (const s of sections) {
        const data = { id: s.id, name: s.name, isActive: true, createdAt: Timestamp.now() };
        await addOp(adminDb.collection("master_sections").doc(s.id), data);
        rtdbMaster.sections[s.id] = data;
    }

    // 3. Mapping
    for (const c of classData) {
        for (const s of sections) {
            const id = `${c.id}_${s.id}`;
            const data = {
                id, classId: c.id, className: c.name, sectionId: s.id, sectionName: s.name,
                displayName: `${c.name} - ${s.name}`, isActive: true, createdAt: Timestamp.now()
            };
            await addOp(adminDb.collection("master_class_sections").doc(id), data);
            rtdbMaster.classSections[id] = data;
        }
    }

    // 4. Global Fee Config
    const feeAmounts: Record<string, number> = {};
    classData.forEach(c => feeAmounts[c.name] = 15000 + (classData.indexOf(c) * 2000));
    const feeConfig = {
        terms: [
            { id: "term_1", name: "I Term (Admission)", dueDate: "2026-06-15", isActive: true, amounts: feeAmounts },
            { id: "term_2", name: "II Term (Mid-Year)", dueDate: "2026-10-15", isActive: true, amounts: feeAmounts },
            { id: "term_3", name: "III Term (Final)", dueDate: "2027-02-15", isActive: true, amounts: feeAmounts },
        ],
        updatedAt: Timestamp.now()
    };
    await addOp(adminDb.collection("config").doc("fees"), feeConfig);

    // 5. Students (Exactly 200)
    let studentIdCounter = 1000;
    console.log("[Seeding] Generating 200 students with financial records...");
    for (const cls of classData) {
        for (const sec of sections) {
            for (let i = 1; i <= 10; i++) {
                studentIdCounter++;
                const schoolId = `SHS${studentIdCounter}`;
                const fName = getRandom(firstNames);
                const lName = getRandom(lastNames);
                const sName = `${fName} ${lName}`;
                const mobile = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
                const vId = getRandom(villageIds);
                const vName = villageNames[villageIds.indexOf(vId)];

                // Generate Keywords
                const searchTags = new Set<string>();
                [sName, schoolId, mobile, vName, fName, lName].forEach(term => {
                    const normalized = String(term).toLowerCase().trim();
                    searchTags.add(normalized);
                    if (normalized.length >= 1) {
                        for (let k = 1; k <= normalized.length; k++) {
                            searchTags.add(normalized.substring(0, k));
                        }
                    }
                });
                sName.toLowerCase().split(/\s+/).forEach(token => {
                    if (token.length >= 1) {
                        for (let k = 1; k <= token.length; k++) {
                            searchTags.add(token.substring(0, k));
                        }
                    }
                });

                const studentData = {
                    schoolId, studentName: sName, firstName: fName, lastName: lName,
                    parentName: `${getRandom(fatherNames)} ${lName}`, parentMobile: mobile,
                    villageId: vId, villageName: vName, classId: cls.id, className: cls.name,
                    sectionId: sec.id, sectionName: sec.name, status: "ACTIVE", academicYear: academicYearId,
                    gender: getRandom(genders), dateOfBirth: `201${Math.floor(Math.random() * 9)}-06-01`,
                    transportRequired: Math.random() > 0.7, admissionNumber: `ADM/26/${studentIdCounter}`,
                    address: `${i}, Main Street, ${vName}`, createdAt: Timestamp.now(), recoveryPassword: mobile, type: "student",
                    keywords: Array.from(searchTags)
                };
                await addOp(adminDb.collection("students").doc(schoolId), studentData);

                // Ledger
                const totalTermFee = feeConfig.terms.reduce((acc, t) => acc + (t.amounts[cls.name] || 0), 0);
                const ledgerItems = feeConfig.terms.map(t => ({
                    id: `TERM_${t.id}`, type: "TERM", name: t.name, dueDate: t.dueDate,
                    amount: t.amounts[cls.name], paidAmount: 0, status: "PENDING"
                }));
                await addOp(adminDb.collection("student_fee_ledgers").doc(`${schoolId}_${academicYearId}`), {
                    studentId: schoolId, academicYearId, classId: cls.id, className: cls.name,
                    totalFee: totalTermFee, totalPaid: 0, status: "PENDING", items: ledgerItems, updatedAt: new Date().toISOString()
                });

                // Search Index (Legacy/Global)
                await addOp(adminDb.collection("search_index").doc(schoolId), {
                    id: schoolId, entityId: schoolId, type: "student",
                    title: sName, subtitle: `${cls.name} | ${vName}`,
                    url: `/admin/students/${schoolId}`,
                    keywords: Array.from(searchTags),
                    updatedAt: Timestamp.now()
                });

                // Random Payment
                if (Math.random() > 0.5) {
                    await addOp(adminDb.collection("payments").doc(`PAY_${schoolId}`), {
                        studentId: schoolId, studentName: sName, amount: 5000,
                        method: "cash", date: Timestamp.now(), status: "success", createdAt: Timestamp.now()
                    });
                }
            }
        }
    }

    // 6. HR Data (Staff Roles)
    console.log("[Seeding] Generating HR data...");
    const staffRoles = [
        { code: "DRIVER", name: "Driver", hasLogin: false },
        { code: "CLEANER", name: "Cleaner", hasLogin: false },
        { code: "WATCHMAN", name: "Watchman", hasLogin: false },
        { code: "ACCOUNTANT", name: "Accountant", hasLogin: true },
        { code: "CLERK", name: "Clerk", hasLogin: true },
        { code: "PRINCIPAL", name: "Principal", hasLogin: true }
    ];
    for (const r of staffRoles) {
        await addOp(adminDb.collection("master_staff_roles").doc(r.code), r);
    }

    // 7. Teachers
    const teacherNames = [
        "Dr. Venkat Rao", "Mrs. Lakshmi Devi", "Mr. Satyanarayana M", "Dr. Geeta Pillai",
        "Prof. K. Subramaniam", "Ms. Rajeshwari Reddy", "Mr. Anand Murthy", "Mrs. Shanthi Bhushan",
        "Dr. Pradeep Kumar", "Ms. Nirmala Sitharaman", "Mr. Jagadeesh Chandra", "Mrs. Padmaja Naidu",
        "Mr. Bhaskar Rao", "Ms. Srilatha V", "Dr. Murali Manohar"
    ];
    for (let i = 0; i < teacherNames.length; i++) {
        const id = `TCH${100 + i}`;
        const name = teacherNames[i];
        const mobile = `98480${20000 + i}`;
        const tags = new Set<string>();
        [name, id, mobile].forEach(t => {
            const n = String(t).toLowerCase();
            tags.add(n);
            if (n.length >= 1) {
                for (let k = 1; k <= n.length; k++) tags.add(n.substring(0, k));
            }
        });
        name.toLowerCase().split(/\s+/).forEach(t => { if (t.length >= 1) for (let k = 1; k <= t.length; k++) tags.add(t.substring(0, k)); });

        await addOp(adminDb.collection("teachers").doc(id), {
            id, schoolId: id, name, mobile, status: "ACTIVE",
            salary: 25000 + (i * 500), recoveryPassword: mobile,
            createdAt: Timestamp.now(), keywords: Array.from(tags)
        });
        await addOp(adminDb.collection("search_index").doc(id), {
            id, entityId: id, type: "teacher", title: name, subtitle: `Faculty | ${id}`,
            url: `/admin/teachers/${id}`, keywords: Array.from(tags), updatedAt: Timestamp.now()
        });
    }

    // 8. Staff
    const staffNames = ["Somulu", "Yadiah", "Narsimha", "Laxmi", "Bharat", "Mallaiah", "Pentamma", "Ramulu", "Sattiah", "Chandraiah"];
    const sRoles = ["DRIVER", "CLEANER", "WATCHMAN", "DRIVER", "WATCHMAN", "DRIVER", "CLEANER", "WATCHMAN", "WATCHMAN", "CLEANER"];
    for (let i = 0; i < staffNames.length; i++) {
        const id = `STF${500 + i}`;
        const name = staffNames[i];
        const mobile = `91000${60000 + i}`;
        const tags = new Set<string>();
        [name, id, mobile].forEach(t => {
            const n = String(t).toLowerCase();
            tags.add(n);
            if (n.length >= 1) {
                for (let k = 1; k <= n.length; k++) tags.add(n.substring(0, k));
            }
        });

        await addOp(adminDb.collection("staff").doc(id), {
            id, schoolId: id, name, mobile, status: "ACTIVE",
            roleCode: sRoles[i], baseSalary: 12000 + (i * 200),
            createdAt: Timestamp.now(), keywords: Array.from(tags)
        });
        await addOp(adminDb.collection("search_index").doc(id), {
            id, entityId: id, type: "staff", title: name, subtitle: `${sRoles[i]} | ${id}`,
            url: `/admin/staff/${id}`, keywords: Array.from(tags), updatedAt: Timestamp.now()
        });
    }

    // 9. Notices
    const notices = [
        { title: "Academic Year 2026-27 Enrollment", content: "Admissions open.", audience: "ALL", urgency: "IMPORTANT" },
        { title: "Annual Day 2026", content: "Coming soon.", audience: "STUDENTS", urgency: "NORMAL" }
    ];
    for (const n of notices) {
        await addOp(adminDb.collection("notices").doc(), { ...n, date: Timestamp.now(), status: "PUBLISHED", createdAt: Timestamp.now() });
    }

    await commitBatch();

    // 10. RTDB Sync
    console.log("[Seeding] Syncing Master Data to Realtime Database...");
    try {
        await adminRtdb.ref("master").set(rtdbMaster);
    } catch (e) {
        console.warn("[Seeding] RTDB Sync skipped or failed:", e);
    }

    console.log("[Seeding] Success. 200 student ecosystem built.");
    return true;
};

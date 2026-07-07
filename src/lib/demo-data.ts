import { adminDb, adminRtdb, Timestamp } from "@/lib/firebase-admin";

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
export const seedDemoData = async (branchId: string) => {
    console.log(`[Seeding] Initiating server-side ecosystem rebuild for branch ${branchId}...`);

    // Fetch Branch Configuration for prefixes
    const branchDoc = await adminDb.collection("branches").doc(branchId).get();
    const branchData = branchDoc.exists ? branchDoc.data() : {};
    const websiteSettingsDoc = await adminDb.collection("website_settings").doc("main").get();
    const websiteSettingsData = websiteSettingsDoc.exists ? websiteSettingsDoc.data() : {};

    const studentIdPrefix = branchData?.studentIdPrefix || websiteSettingsData?.studentIdPrefix || "SHS";
    const studentIdSuffix = branchData?.studentIdSuffix ? Number(branchData.studentIdSuffix) : (websiteSettingsData?.studentIdSuffix ? Number(websiteSettingsData.studentIdSuffix) : 1000);
    const teacherIdPrefix = branchData?.teacherIdPrefix || websiteSettingsData?.teacherIdPrefix || "CST";
    const teacherIdSuffix = branchData?.teacherIdSuffix ? Number(branchData.teacherIdSuffix) : (websiteSettingsData?.teacherIdSuffix ? Number(websiteSettingsData.teacherIdSuffix) : 100);

    // Helper to delete all docs in a collection belonging to this branch
    const nukeCollectionForBranch = async (collectionName: string, targetBranchId: string) => {
        const ref = adminDb.collection(collectionName);
        try {
            const batchDelete = async (q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>) => {
                while (true) {
                    const snap = await q.limit(500).get();
                    if (snap.empty) break;
                    const batch = adminDb.batch();
                    snap.docs.forEach((d: any) => batch.delete(d.ref));
                    await batch.commit();
                    if (snap.size < 500) break;
                }
            };
            
            // Delete matching branchId
            await batchDelete(ref.where("branchId", "==", targetBranchId));
            // Delete matching schoolId (some collections or legacy docs use schoolId as tenant key)
            await batchDelete(ref.where("schoolId", "==", targetBranchId));
        } catch (e) {
            console.warn(`[Seeding] Could not purge ${collectionName} for branch ${targetBranchId}:`, e);
        }
    };

    console.log(`[Seeding] Purging old data for branch ${branchId}...`);
    const coreCols = [
        "students", "master_villages", "master_classes", "master_sections", "master_class_sections",
        "payments", "applications", "leaves", "teachers", "staff", "student_fee_ledgers", "search_index", "notices",
        "attendance_daily", "student_change_requests", "exams", "exam_results", "villages", "classes", "sections"
    ];
    for (const col of coreCols) {
        await nukeCollectionForBranch(col, branchId);
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
        const data = { id, name, isActive: true, code: `VIL${i + 1}`, active: true, studentCount: 20, createdAt: Timestamp.now(), schoolId: branchId, branchId: branchId };
        
        await addOp(adminDb.collection("master_villages").doc(id), data);
        await addOp(adminDb.collection("villages").doc(`${branchId}_${id}`), data);
        rtdbMaster.villages[id] = { id, name, isActive: true, createdAt: Timestamp.now() };
    }

    // 2. Classes & Sections
    const classData: { id: string, name: string }[] = [];
    for (let i = 1; i <= 10; i++) {
        const id = `CLS_${String(i).padStart(2, '0')}`;
        const name = i === 1 ? "Nursery" : i === 2 ? "LKG" : i === 3 ? "UKG" : `Class ${i - 3}`;
        classData.push({ id, name });
        const data = { id, name, isActive: true, active: true, order: i, createdAt: Timestamp.now(), schoolId: branchId, branchId: branchId };
        
        await addOp(adminDb.collection("master_classes").doc(id), data);
        await addOp(adminDb.collection("classes").doc(`${branchId}_${id}`), data);
        rtdbMaster.classes[id] = { id, name, isActive: true, order: i, createdAt: Timestamp.now() };
    }

    const sections = [
        { id: "SEC_A", name: "A" },
        { id: "SEC_B", name: "B" }
    ];
    for (const s of sections) {
        const data = { id: s.id, name: s.name, isActive: true, active: true, createdAt: Timestamp.now(), schoolId: branchId, branchId: branchId };
        
        await addOp(adminDb.collection("master_sections").doc(s.id), data);
        await addOp(adminDb.collection("sections").doc(`${branchId}_${s.id}`), data);
        rtdbMaster.sections[s.id] = { id: s.id, name: s.name, isActive: true, createdAt: Timestamp.now() };
    }

    // 3. Mapping
    for (const c of classData) {
        for (const s of sections) {
            const id = `${c.id}_${s.id}`;
            const docId = `${branchId}_${id}`;
            const data = {
                id: docId, classId: c.id, className: c.name, sectionId: s.id, sectionName: s.name,
                displayName: `${c.name} - ${s.name}`, isActive: true, createdAt: Timestamp.now(),
                schoolId: branchId, branchId: branchId
            };
            await addOp(adminDb.collection("master_class_sections").doc(docId), data);
            rtdbMaster.classSections[id] = {
                id, classId: c.id, className: c.name, sectionId: s.id, sectionName: s.name,
                displayName: `${c.name} - ${s.name}`, isActive: true, createdAt: Timestamp.now()
            };
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

    // 5. Students (Exactly ~400)
    let studentIdCounter = studentIdSuffix;
    console.log("[Seeding] Generating ~400 students with financial records...");
    for (const cls of classData) {
        for (const sec of sections) {
            // Approx 20 students per section
            for (let i = 1; i <= 20; i++) {
                studentIdCounter++;
                const schoolId = `${studentIdPrefix}${String(studentIdCounter).padStart(5, "0")}`;
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
                    transportRequired: Math.random() > 0.7, admissionNo: schoolId,
                    address: `${i}, Main Street, ${vName}`, createdAt: Timestamp.now(), recoveryPassword: mobile, type: "student",
                    rollNo: String(i).padStart(2, '0'), keywords: Array.from(searchTags),
                    branchId: branchId
                };
                await addOp(adminDb.collection("students").doc(schoolId), studentData);

                // Ledger
                const totalTermFee = feeConfig.terms.reduce((acc, t) => acc + (t.amounts[cls.name] || 0), 0);
                const hasPayment = Math.random() > 0.5;
                const paymentAmount = 5000;
                const totalPaid = hasPayment ? paymentAmount : 0;

                const ledgerItems = feeConfig.terms.map((t, idx) => {
                    const itemFee = t.amounts[cls.name] || 0;
                    let itemPaid = 0;
                    let itemStatus = "PENDING";
                    
                    if (hasPayment && idx === 0) {
                        itemPaid = Math.min(itemFee, paymentAmount);
                        itemStatus = itemPaid >= itemFee ? "PAID" : "PARTIAL";
                    }
                    
                    return {
                        id: `TERM_${t.id}`, type: "TERM", name: t.name, dueDate: t.dueDate,
                        amount: itemFee, paidAmount: itemPaid, status: itemStatus
                    };
                });

                await addOp(adminDb.collection("student_fee_ledgers").doc(`${schoolId}_${academicYearId}`), {
                    studentId: schoolId, academicYearId, classId: cls.id, className: cls.name,
                    totalFee: totalTermFee, totalPaid: totalPaid, status: totalPaid >= totalTermFee ? "PAID" : (totalPaid > 0 ? "PARTIAL" : "PENDING"), items: ledgerItems, updatedAt: new Date().toISOString(),
                    branchId: branchId
                });

                // Search Index (Legacy/Global but scoped)
                await addOp(adminDb.collection("search_index").doc(schoolId), {
                    id: schoolId, entityId: schoolId, type: "student",
                    title: sName, subtitle: `${cls.name} | ${vName}`,
                    url: `/admin/students/${schoolId}`,
                    keywords: Array.from(searchTags),
                    updatedAt: Timestamp.now(),
                    branchId: branchId,
                    schoolId: branchId
                });

                // Random Payment
                if (hasPayment) {
                    await addOp(adminDb.collection("payments").doc(`PAY_${schoolId}`), {
                        studentId: schoolId, studentName: sName, amount: paymentAmount,
                        method: "cash", date: Timestamp.now(), status: "success", createdAt: Timestamp.now(),
                        schoolId: branchId, branchId: branchId
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

    // 7. Teachers (25 Teachers)
    const teacherNames = [
        "Dr. Venkat Rao", "Mrs. Lakshmi Devi", "Mr. Satyanarayana M", "Dr. Geeta Pillai",
        "Prof. K. Subramaniam", "Ms. Rajeshwari Reddy", "Mr. Anand Murthy", "Mrs. Shanthi Bhushan",
        "Dr. Pradeep Kumar", "Ms. Nirmala Sitharaman", "Mr. Jagadeesh Chandra", "Mrs. Padmaja Naidu",
        "Mr. Bhaskar Rao", "Ms. Srilatha V", "Dr. Murali Manohar", "Mrs. Aruna Kumari",
        "Mr. Srinivasa Reddy", "Ms. Bhavani T", "Mr. Kiran Kumar", "Mrs. Sowmya K",
        "Dr. Raghavendra Rao", "Ms. Divya S", "Mr. Vinay Kumar", "Mrs. Sushma R", "Mr. Praveen T"
    ];

    // Create Teachers in Firestore
    let teacherIdCounter = teacherIdSuffix;
    for (let i = 0; i < teacherNames.length; i++) {
        teacherIdCounter++;
        const id = `${teacherIdPrefix}${String(teacherIdCounter).padStart(5, "0")}`;
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
            id, teacherId: id, schoolId: branchId, branchId: branchId, name, mobile, status: "ACTIVE",
            salary: 35000 + (i * 1000), recoveryPassword: mobile,
            createdAt: Timestamp.now(), keywords: Array.from(tags)
        });
        await addOp(adminDb.collection("search_index").doc(id), {
            id, entityId: id, type: "teacher", title: name, subtitle: `Faculty | ${id}`,
            url: `/admin/teachers/${id}`, keywords: Array.from(tags), updatedAt: Timestamp.now(),
            schoolId: branchId, branchId: branchId
        });
    }

    // 8. Staff
    const staffNames = ["Somulu", "Yadiah", "Narsimha", "Laxmi", "Bharat", "Mallaiah", "Pentamma", "Ramulu", "Sattiah", "Chandraiah"];
    const sRoles = ["DRIVER", "CLEANER", "WATCHMAN", "DRIVER", "WATCHMAN", "DRIVER", "CLEANER", "WATCHMAN", "WATCHMAN", "CLEANER"];
    for (let i = 0; i < staffNames.length; i++) {
        const id = `${branchId}_STF${500 + i}`;
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
            id, staffId: id, schoolId: branchId, branchId: branchId, name, mobile, status: "ACTIVE",
            roleCode: sRoles[i], baseSalary: 12000 + (i * 200),
            createdAt: Timestamp.now(), keywords: Array.from(tags)
        });
        await addOp(adminDb.collection("search_index").doc(id), {
            id, entityId: id, type: "staff", title: name, subtitle: `${sRoles[i]} | ${id}`,
            url: `/admin/staff/${id}`, keywords: Array.from(tags), updatedAt: Timestamp.now(),
            schoolId: branchId, branchId: branchId
        });
    }

    // 9. Assign Teachers to Classes (Class Teachers & Subject Teachers)
    rtdbMaster.subjectTeachers = {};
    const getTeacherId = (index: number) => {
        const counter = teacherIdSuffix + index + 1;
        return `${teacherIdPrefix}${String(counter).padStart(5, "0")}`;
    };
    let teacherIndex = 0;

    const studentRefsByClassSec: Record<string, string[]> = {};
    const classSectionsReal: any[] = [];

    for (const csKey in rtdbMaster.classSections) {
        const cs = rtdbMaster.classSections[csKey];
        // Assign Class Teacher
        const ctId = getTeacherId(teacherIndex % teacherNames.length);
        cs.classTeacherId = ctId;
        classSectionsReal.push(cs);

        // Assign Subject Teachers for this class section
        rtdbMaster.subjectTeachers[csKey] = {
            "math": getTeacherId((teacherIndex + 1) % teacherNames.length),
            "science": getTeacherId((teacherIndex + 2) % teacherNames.length),
            "english": getTeacherId((teacherIndex + 3) % teacherNames.length)
        };

        teacherIndex++;
        studentRefsByClassSec[csKey] = [];
    }

    // Since we know the students we generated, we can map them directly:
    let tempStudentCounter = studentIdSuffix;
    for (const c of classData) {
        for (const s of sections) {
            const csKey = `${c.id}_${s.id}`;
            for (let i = 1; i <= 20; i++) {
                tempStudentCounter++;
                const schoolId = `${studentIdPrefix}${String(tempStudentCounter).padStart(5, "0")}`;
                studentRefsByClassSec[csKey].push(schoolId);
            }
        }
    }

    // 10. Generate 5 Days of Attendance
    console.log("[Seeding] Generating recent attendance records...");
    const today = new Date();
    for (let daysAgo = 5; daysAgo >= 1; daysAgo--) {
        const dateObj = new Date(today);
        dateObj.setDate(dateObj.getDate() - daysAgo);
        // skip sundays
        if (dateObj.getDay() === 0) continue;
        const dateStr = dateObj.toISOString().split('T')[0];

        for (const cs of classSectionsReal) {
            const csKey = cs.id;
            const studentsInSec = studentRefsByClassSec[csKey];
            if (!studentsInSec || studentsInSec.length === 0) continue;

            const records: Record<string, 'P' | 'A' | 'L'> = {};
            let presentCount = 0;
            let absentCount = 0;

            studentsInSec.forEach(sid => {
                const rand = Math.random();
                if (rand > 0.95) {
                    records[sid] = 'A';
                    absentCount++;
                } else if (rand > 0.90) {
                    records[sid] = 'L'; // Late
                    presentCount++;     // Late is technically marked present for total count
                } else {
                    records[sid] = 'P';
                    presentCount++;
                }
            });

            const docId = `${dateStr}_${cs.classId}_${cs.sectionId}`;
            await addOp(adminDb.collection("attendance_daily").doc(`${branchId}_${docId}`), {
                date: dateStr,
                classId: cs.classId,
                sectionId: cs.sectionId,
                records,
                markedBy: cs.classTeacherId,
                timestamp: Timestamp.fromDate(dateObj),
                stats: { total: studentsInSec.length, present: presentCount, absent: absentCount },
                schoolId: branchId,
                branchId: branchId
            });
        }
    }

    // 11. Generate Student Change Requests
    console.log("[Seeding] Generating pending student change requests...");
    const dummyReqs = [
        {
            type: "EDIT",
            studentId: `${studentIdPrefix}${String(studentIdSuffix + 1).padStart(5, "0")}`,
            classId: classData[0].id,
            sectionId: sections[0].id,
            requestedBy: rtdbMaster.classSections[`${classData[0].id}_${sections[0].id}`].classTeacherId,
            status: "PENDING",
            timestamp: Timestamp.now(),
            differences: { mobile: { old: "9999999999", new: "9888888888" }, address: { old: "Hyderabad", new: "Secunderabad" } },
            requestPayload: { parentMobile: "9888888888", address: "Secunderabad" },
            studentName: getRandom(firstNames) + " " + getRandom(lastNames),
            className: classData[0].name,
            sectionName: sections[0].name,
            schoolId: branchId,
            branchId: branchId
        },
        {
            type: "ADD",
            classId: classData[1].id,
            sectionId: sections[1].id,
            requestedBy: rtdbMaster.classSections[`${classData[1].id}_${sections[1].id}`].classTeacherId,
            status: "PENDING",
            timestamp: Timestamp.now(),
            differences: {},
            requestPayload: { studentName: "New Student Entry", gender: "male", parentName: "Father Name", parentMobile: "9000000000" },
            studentName: "New Student Entry",
            className: classData[1].name,
            sectionName: sections[1].name,
            schoolId: branchId,
            branchId: branchId
        }
    ];

    for (const req of dummyReqs) {
        await addOp(adminDb.collection("student_change_requests").doc(), req);
    }

    // 12. Notices
    const notices = [
        { title: "Academic Year 2026-27 Enrollment", content: "Admissions open.", audience: "ALL", urgency: "IMPORTANT" },
        { title: "Annual Day 2026", content: "Coming soon.", audience: "STUDENTS", urgency: "NORMAL" }
    ];
    for (const n of notices) {
        await addOp(adminDb.collection("notices").doc(), { ...n, date: Timestamp.now(), status: "PUBLISHED", createdAt: Timestamp.now(), schoolId: branchId, branchId: branchId });
    }

    // 13. Generate Perfect Exams History
    console.log("[Seeding] Generating Perfect Exams History...");
    const pastExams = [
        { id: "exam_past_final", name: "Final Examination 2025", date: "2026-03-15", academicYearId: "2025-2026" },
        { id: "exam_ut1", name: "Unit Test 1", date: "2026-08-15", academicYearId: academicYearId },
        { id: "exam_qtr", name: "Quarterly Examination", date: "2026-10-20", academicYearId: academicYearId }
    ];

    for (const ex of pastExams) {
        const timetables: any = {};
        for (const cls of classData) {
            timetables[cls.id] = {
                "math": { enabled: true, examDate: ex.date, startTime: "10:00", endTime: "12:00" },
                "science": { enabled: true, examDate: ex.date, startTime: "10:00", endTime: "12:00" },
                "english": { enabled: true, examDate: ex.date, startTime: "10:00", endTime: "12:00" }
            };
        }

        await addOp(adminDb.collection("exams").doc(`${branchId}_${ex.id}`), {
            id: ex.id,
            name: ex.name,
            academicYear: ex.academicYearId,
            startDate: ex.date,
            endDate: ex.date,
            status: "COMPLETED",
            timetables: timetables,
            schoolId: branchId,
            branchId: branchId
        });

        // Generate results for every class section
        for (const cs of classSectionsReal) {
            const csKey = cs.id;
            const studentsInSec = studentRefsByClassSec[csKey];
            if (!studentsInSec || studentsInSec.length === 0) continue;

            const subjectsList = [
                { id: "math", name: "Mathematics", max: 100 },
                { id: "science", name: "Science", max: 100 },
                { id: "english", name: "English", max: 100 }
            ];

            // Add Syllabus
            await addOp(adminDb.collection("exam_syllabus").doc(`${branchId}_${ex.id}_${cs.classId}_${cs.sectionId}`), {
                examId: ex.id,
                classId: cs.classId,
                sectionId: cs.sectionId,
                syllabus: subjectsList.map(s => ({
                    subjectId: s.id,
                    subjectName: s.name,
                    topics: "Chapters 1 to 3, basic concepts",
                    examDate: ex.date
                })),
                schoolId: branchId,
                branchId: branchId
            });

            // Generate Results
            for (const studentId of studentsInSec) {
                const subjects: any = {};
                let totalMarks = 0;
                let isFail = false;
                
                subjectsList.forEach(sub => {
                    const isStudentFail = Math.random() > 0.95;
                    const minMarks = isStudentFail ? 20 : 40;
                    const maxMarks = isStudentFail ? 34 : 100;
                    const m = Math.floor(Math.random() * (maxMarks - minMarks + 1)) + minMarks;
                    subjects[sub.id] = { obtained: m, maxMarks: sub.max, passMarks: 35 };
                    totalMarks += m;
                    if (m < 35) isFail = true;
                });
                
                const percentage = totalMarks / (subjectsList.length * 100) * 100;
                let grade = "F";
                if (!isFail) {
                    if (percentage >= 90) grade = "A+";
                    else if (percentage >= 80) grade = "A";
                    else if (percentage >= 70) grade = "B";
                    else if (percentage >= 60) grade = "C";
                    else if (percentage >= 50) grade = "D";
                    else grade = "E";
                }

                await addOp(adminDb.collection("exam_results").doc(`${branchId}_${ex.id}_${studentId}`), {
                    examId: ex.id,
                    studentId: studentId,
                    classId: cs.classId,
                    sectionId: cs.sectionId,
                    academicYear: ex.academicYearId,
                    subjects: subjects,
                    totalMarks: totalMarks,
                    percentage: parseFloat(percentage.toFixed(2)),
                    grade: grade,
                    status: "PUBLISHED",
                    schoolId: branchId,
                    branchId: branchId,
                    createdAt: Timestamp.now()
                });
            }
        }
    }

    await commitBatch();

    // 13. RTDB Sync
    console.log("[Seeding] Syncing Master Data to Realtime Database...");
    try {
        await adminRtdb.ref("master").set(rtdbMaster);
    } catch (e) {
        console.warn("[Seeding] RTDB Sync skipped or failed:", e);
    }

    console.log(`[Seeding] Success. ~400 student ecosystem built with hierarchy and attendance for branch ${branchId}.`);
    return true;
};

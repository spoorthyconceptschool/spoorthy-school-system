import { collection, doc, setDoc, writeBatch, Timestamp, query, getDocs, getDoc } from "firebase/firestore";
import { ref, set } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";

/**
 * Enterprise Demo Data Seeding Script
 * Generates a full ecosystem for testing:
 * - 200 Students (10 per section, 2 sections, 10 classes)
 * - Master Data (Villages, Classes, Sections) - Both Firestore & RTDB
 * - Financial Data (Fee Ledgers, Payments)
 * - HR Data (Teachers, Leaves)
 * - Operational Data (Admissions, Search Index)
 * - Config (Academic Years, System Constants)
 */
export const seedDemoData = async () => {
    // Helper for large batch operations
    const commitInChunks = async (operations: { ref: any, data: any, type: 'set' | 'update' | 'delete' }[]) => {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
            const chunk = operations.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(op => {
                if (op.type === 'set') batch.set(op.ref, op.data, { merge: true });
                else if (op.type === 'update') batch.update(op.ref, op.data);
                else if (op.type === 'delete') batch.delete(op.ref);
            });
            await batch.commit();
            console.log(`Committed chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(operations.length / CHUNK_SIZE)}`);
        }
    };

    const ops: any[] = [];
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

    // Helper to delete all docs in a collection
    const queueDeleteCollection = async (collectionName: string) => {
        try {
            const q = query(collection(db, collectionName));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach((d) => {
                ops.push({ ref: d.ref, type: 'delete' });
            });
        } catch (e) {
            console.warn(`Could not purge ${collectionName}:`, e);
        }
    };

    console.log("Starting full system purge...");
    await queueDeleteCollection("students");
    await queueDeleteCollection("master_villages");
    await queueDeleteCollection("master_classes");
    await queueDeleteCollection("master_sections");
    await queueDeleteCollection("master_class_sections");
    await queueDeleteCollection("payments");
    await queueDeleteCollection("applications");
    await queueDeleteCollection("leaves");
    await queueDeleteCollection("teachers");
    await queueDeleteCollection("student_fee_ledgers");
    await queueDeleteCollection("search_index");

    const firstNames = ["Arjun", "Aaditya", "Vihaan", "Krishna", "Sai", "Ishaan", "Aarav", "Reyansh", "Aryan", "Abhimanyu", "Priya", "Ananya", "Diya", "Saanvi", "Aadhya", "Myra", "Ishani", "Anvi", "Kyra", "Aarohi"];
    const lastNames = ["Sharma", "Verma", "Gupta", "Reddy", "Patel", "Singh", "Yadav", "Kumar", "Rao", "Choudhary"];
    const fatherNames = ["Vikram", "Suresh", "Rajeev", "Amit", "Manish", "Sanjay", "Vishnu", "Ramesh", "Kiran", "Prasad"];
    const villageNames = ["Miyapur", "Bachupally", "Nizampet", "Kukatpally", "Hyder Nagar", "Pragathi Nagar", "Beeramguda", "Ameenpur", "Patancheru", "Kondapur"];
    const genders = ["male", "female"];

    const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const academicYearId = "2026-2027";

    // 0. Academic Config
    ops.push({
        ref: doc(db, "config", "academic_years"),
        type: 'set',
        data: {
            currentYear: academicYearId,
            currentYearStartDate: "2026-06-01",
            upcoming: ["2027-2028"],
            history: [{ year: "2025-2026", startDate: "2025-06-01", archivedAt: Timestamp.now() }]
        }
    });

    // 1. Seed Master Data: Villages
    const villageIds: string[] = [];
    villageNames.forEach((name, i) => {
        const id = `VIL_${String(i + 1).padStart(3, '0')}`;
        villageIds.push(id);
        const data = { id, name, isActive: true, createdAt: Timestamp.now() };
        ops.push({ ref: doc(db, "master_villages", id), type: 'set', data });
        rtdbMaster.villages[id] = data;
    });

    // 2. Seed Master Data: Classes & Sections
    const classData: { id: string, name: string }[] = [];
    for (let i = 1; i <= 10; i++) {
        const id = `CLS_${String(i).padStart(2, '0')}`;
        const name = i === 1 ? "Nursery" : i === 2 ? "LKG" : i === 3 ? "UKG" : `Class ${i - 3}`;
        classData.push({ id, name });
        const data = { id, name, isActive: true, order: i, createdAt: Timestamp.now() };
        ops.push({ ref: doc(db, "master_classes", id), type: 'set', data });
        rtdbMaster.classes[id] = data;
    }

    const sections = [
        { id: "SEC_A", name: "A" },
        { id: "SEC_B", name: "B" }
    ];
    sections.forEach(s => {
        const data = { id: s.id, name: s.name, isActive: true, createdAt: Timestamp.now() };
        ops.push({ ref: doc(db, "master_sections", s.id), type: 'set', data });
        rtdbMaster.sections[s.id] = data;
    });

    // 3. Class-Section Mapping
    classData.forEach(c => {
        sections.forEach(s => {
            const id = `${c.id}_${s.id}`;
            const data = {
                id,
                classId: c.id,
                className: c.name,
                sectionId: s.id,
                sectionName: s.name,
                displayName: `${c.name} - ${s.name}`,
                isActive: true,
                createdAt: Timestamp.now()
            };
            ops.push({ ref: doc(db, "master_class_sections", id), type: 'set', data });
            rtdbMaster.classSections[id] = data;
        });
    });

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
    ops.push({ ref: doc(db, "config", "fees"), type: 'set', data: feeConfig });

    // 5. Seed Students (Exactly 10 per section, 2 sections per class = 200 total)
    let studentIdCounter = 1000;

    console.log("Generating 200 enterprise students...");
    for (const cls of classData) {
        for (const sec of sections) {
            for (let i = 1; i <= 10; i++) {
                studentIdCounter++;
                const schoolId = `SHS${studentIdCounter}`;

                const fName = getRandom(firstNames);
                const lName = getRandom(lastNames);
                const sName = `${fName} ${lName}`;
                const pName = `${getRandom(fatherNames)} ${lName}`;
                const mobile = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
                const vId = getRandom(villageIds);
                const vName = villageNames[villageIds.indexOf(vId)];
                const gender = getRandom(genders);

                const studentData = {
                    schoolId,
                    studentName: sName,
                    firstName: fName,
                    lastName: lName,
                    parentName: pName,
                    parentMobile: mobile,
                    villageId: vId,
                    villageName: vName,
                    classId: cls.id,
                    className: cls.name,
                    sectionId: sec.id,
                    sectionName: sec.name,
                    status: "ACTIVE",
                    academicYear: academicYearId,
                    gender,
                    dateOfBirth: `201${Math.floor(Math.random() * 9)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
                    transportRequired: Math.random() > 0.7,
                    admissionNumber: `ADM/${academicYearId}/${studentIdCounter}`,
                    address: `${i}, Main Street, ${vName}`,
                    createdAt: Timestamp.now(),
                    recoveryPassword: mobile,
                    type: "student",
                    version: 1
                };

                ops.push({ ref: doc(db, "students", schoolId), type: 'set', data: studentData });

                // 5.1 Fee Ledger
                const totalTermFee = feeConfig.terms.reduce((acc, t) => acc + (t.amounts[cls.name] || 0), 0);
                const ledgerItems = feeConfig.terms.map(t => ({
                    id: `TERM_${t.id}`,
                    type: "TERM",
                    name: t.name,
                    dueDate: t.dueDate,
                    amount: t.amounts[cls.name],
                    paidAmount: 0,
                    status: "PENDING"
                }));

                const ledgerData = {
                    studentId: schoolId,
                    academicYearId: academicYearId,
                    classId: cls.id,
                    className: cls.name,
                    totalFee: totalTermFee,
                    totalPaid: 0,
                    status: "PENDING",
                    items: ledgerItems,
                    updatedAt: new Date().toISOString()
                };
                ops.push({ ref: doc(db, "student_fee_ledgers", `${schoolId}_${academicYearId}`), type: 'set', data: ledgerData });

                // 5.2 Search Index
                const keywords = [sName, schoolId, mobile, cls.name, vName, fName, lName].map(v => String(v).toLowerCase());
                ops.push({
                    ref: doc(db, "search_index", schoolId),
                    type: 'set',
                    data: {
                        id: schoolId, entityId: schoolId, type: "student",
                        title: sName, subtitle: `${cls.name} | ${vName}`,
                        url: `/admin/students/${schoolId}`,
                        keywords, updatedAt: Timestamp.now()
                    }
                });

                // 5.3 Random Payments
                if (Math.random() > 0.4) {
                    const payAmount = Math.random() > 0.8 ? totalTermFee : (feeConfig.terms[0].amounts[cls.name] || 5000);
                    ops.push({
                        ref: doc(db, "payments", `PAY_${schoolId}_${i}`),
                        type: 'set',
                        data: {
                            studentId: schoolId, studentName: sName, amount: payAmount,
                            method: getRandom(["cash", "upi", "bank_transfer"]),
                            date: Timestamp.now(), status: "success", createdAt: Timestamp.now()
                        }
                    });
                    if (payAmount >= totalTermFee) { ledgerData.totalPaid = totalTermFee; ledgerData.status = "PAID"; }
                    else { ledgerData.totalPaid = payAmount; ledgerData.status = "PARTIAL"; }
                }
            }
        }
    }

    // 6. HR & STAFF
    const staffSubjects = ["math", "science", "english"];
    for (let i = 1; i <= 5; i++) {
        const tId = `TCH_${String(i).padStart(3, '0')}`;
        const tName = `${getRandom(firstNames)} ${getRandom(lastNames)}`;
        const data = { id: tId, teacherId: tId, name: tName, subject: getRandom(staffSubjects), status: "ACTIVE", createdAt: Timestamp.now() };
        ops.push({ ref: doc(db, "teachers", tId), type: 'set', data });

        if (i % 2 === 0) {
            ops.push({
                ref: doc(collection(db, "leaves")),
                type: 'set',
                data: { staffId: tId, staffName: tName, type: "Casual Leave", startDate: "2026-03-01", endDate: "2026-03-01", status: "PENDING", appliedAt: Timestamp.now() }
            });
        }
    }

    // 7. CMS: Notices
    const notices = [
        { title: "Academic Year 2026-27 Enrollment", content: "Admissions are now open for all grades from Nursery to Class 10.", audience: "ALL", urgency: "IMPORTANT" },
        { title: "Annual Sports Meet postponed", content: "Due to rain, the sports meet is rescheduled to March 15th.", audience: "STUDENTS", urgency: "NORMAL" }
    ];
    notices.forEach(n => {
        ops.push({
            ref: doc(collection(db, "notices")),
            type: 'set',
            data: { ...n, date: Timestamp.now(), status: "PUBLISHED", createdAt: Timestamp.now() }
        });
    });

    // FINAL SYNC & COMMIT
    console.log("Syncing Master Data to RTDB...");
    await set(ref(rtdb, 'master'), rtdbMaster);

    console.log(`Committing ${ops.length} Firestore operations in chunks...`);
    await commitInChunks(ops);

    console.log("✅ Demo Seeding Complete. System is now enterprise-populated.");
    return true;
};

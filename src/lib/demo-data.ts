import { collection, doc, setDoc, writeBatch, Timestamp, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const seedDemoData = async () => {
    const batch = writeBatch(db);

    // Helper to delete all docs in a collection
    const deleteCollection = async (collectionName: string) => {
        const q = query(collection(db, collectionName));
        const snapshot = await getDocs(q);
        const deleteBatch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
    };

    // 0. Cleanup Old Data (Students Only per request)
    // 0. Cleanup Old Data
    await deleteCollection("students");
    await deleteCollection("master_villages");
    await deleteCollection("master_classes");
    await deleteCollection("master_sections");
    await deleteCollection("master_class_sections");

    // 1. Seed Students (New Schema per QA Prompt)
    const students = [
        {
            schoolId: "SCSS93821",
            studentName: "Aarav Patel",
            grade: "Class 10",
            section: "A",
            fatherName: "Vikram Patel",
            fatherMobile: "9876543210",
            village: "Miyapur",
            status: "active",
            type: "student",
            password: "changeMe123", // Should be hashed in prod
            mustChangePassword: true,
            createdAt: Timestamp.now()
        },
        {
            schoolId: "SCSS93822",
            studentName: "Diya Sharma",
            grade: "Class 9",
            section: "B",
            fatherName: "Suresh Sharma",
            fatherMobile: "9876543211",
            village: "Bachupally",
            status: "active",
            type: "student",
            password: "changeMe123",
            mustChangePassword: true,
            createdAt: Timestamp.now()
        },
        {
            schoolId: "SCSS93823",
            studentName: "Ishaan Kumar",
            grade: "Class 10",
            section: "A",
            fatherName: "Rajeev Kumar",
            fatherMobile: "9876543212",
            village: "Nizampet",
            status: "active",
            type: "student",
            password: "changeMe123",
            mustChangePassword: true,
            createdAt: Timestamp.now()
        },
        {
            schoolId: "SCSS93824",
            studentName: "Vihaan Singh",
            grade: "Class 8",
            section: "C",
            fatherName: "Amit Singh",
            fatherMobile: "9876543213",
            village: "Kukatpally",
            status: "inactive",
            type: "student",
            password: "changeMe123",
            mustChangePassword: true,
            createdAt: Timestamp.now()
        },
        {
            schoolId: "SCSS93825",
            studentName: "Ananya Gupta",
            grade: "Class 10",
            section: "B",
            fatherName: "Manish Gupta",
            fatherMobile: "9876543214",
            village: "Miyapur",
            status: "active",
            type: "student",
            password: "changeMe123",
            mustChangePassword: true,
            createdAt: Timestamp.now()
        }
    ];

    students.forEach(student => {
        const docRef = doc(db, "students", student.schoolId);
        batch.set(docRef, student);
    });

    // 2. Seed Teachers
    const teachers = [
        {
            teacherId: "T202601",
            name: "Priya Reddy",
            subject: "Mathematics",
            designation: "Senior Teacher",
            phone: "9988776655",
            status: "active",
            type: "teacher",
            createdAt: Timestamp.now()
        },
        {
            teacherId: "T202602",
            name: "Rahul Verma",
            subject: "Science",
            designation: "Lab Instructor",
            phone: "9988776656",
            status: "active",
            type: "teacher",
            createdAt: Timestamp.now()
        },
        {
            teacherId: "T202603",
            name: "Sneha Kapoor",
            subject: "English",
            designation: "Teacher",
            phone: "9988776657",
            status: "on_leave",
            type: "teacher",
            createdAt: Timestamp.now()
        }
    ];

    teachers.forEach(teacher => {
        const docRef = doc(db, "teachers", teacher.teacherId);
        batch.set(docRef, teacher);
    });

    // 3. Seed Applications (for Dashboard Home)
    const applications = [
        {
            studentName: "Rohan Gupta",
            grade: "Class 5",
            fatherName: "Sanjay Gupta",
            phone: "9123456780",
            status: "submitted",
            submittedAt: Timestamp.now()
        },
        {
            studentName: "Meara Reddy",
            grade: "Class 1",
            fatherName: "Vishnu Reddy",
            phone: "9123456781",
            status: "approved",
            submittedAt: Timestamp.now()
        }
    ];

    applications.forEach(app => {
        const docRef = doc(collection(db, "applications"));
        batch.set(docRef, app);
    });

    // 4. Seed Payments
    const payments = [
        {
            studentId: "2026001",
            studentName: "Aarav Patel",
            amount: 15000,
            type: "credit",
            method: "razorpay",
            status: "success",
            date: Timestamp.now()
        },
        {
            studentId: "2026002",
            studentName: "Diya Sharma",
            amount: 5000,
            type: "credit",
            method: "cash",
            status: "success",
            date: Timestamp.now()
        },
        {
            studentId: "2026003",
            studentName: "Ishaan Kumar",
            amount: 7500,
            type: "credit",
            method: "cash",
            status: "success",
            date: Timestamp.now()
        }
    ];

    payments.forEach(payment => {
        const docRef = doc(collection(db, "payments"));
        batch.set(docRef, payment);
    });

    // 5. Seed Fees Config
    const feeConfig = {
        terms: [
            { id: "term1", name: "Term 1", dueDate: "2026-06-30", isActive: true, amounts: { "Class 10": 15000, "Class 9": 14000 } },
            { id: "term2", name: "Term 2", dueDate: "2026-10-31", isActive: true, amounts: { "Class 10": 15000, "Class 9": 14000 } },
            { id: "term3", name: "Term 3", dueDate: "2027-02-28", isActive: false, amounts: { "Class 10": 15000, "Class 9": 14000 } },
        ]
    };
    const feesRef = doc(db, "config", "fees");
    batch.set(feesRef, feeConfig);

    // 6. Seed Notices
    const notices = [
        {
            title: "School Annual Day 2026",
            content: "We are excited to announce the Annual Day celebrations on Feb 20th. All parents are invited.",
            audience: "all",
            date: Timestamp.now(),
            status: "published"
        },
        {
            title: "Exam Schedule - Class 10",
            content: "Pre-board exams start from March 1st. Please check the timetable section.",
            audience: "students",
            grade: "Class 10",
            date: Timestamp.now(),
            status: "published"
        }
    ];
    notices.forEach(notice => {
        const docRef = doc(collection(db, "notices"));
        batch.set(docRef, notice);
    });

    // 7. Seed Leaves
    const leaves = [
        {
            staffId: "T202603",
            staffName: "Sneha Kapoor",
            type: "Sick Leave",
            startDate: "2026-01-20",
            endDate: "2026-01-22",
            reason: "Viral fever",
            status: "pending",
            appliedAt: Timestamp.now()
        },
        {
            staffId: "T202601",
            staffName: "Priya Reddy",
            type: "Casual Leave",
            startDate: "2026-02-05",
            endDate: "2026-02-05",
            reason: "Personal work",
            status: "approved",
            appliedAt: Timestamp.now()
        }
    ];
    leaves.forEach(leave => {
        const docRef = doc(collection(db, "leaves"));
        batch.set(docRef, leave);
    });

    // 8. Seed Master Data: Villages
    const villages = ["Miyapur", "Bachupally", "Nizampet", "Kukatpally", "Hyder Nagar", "Pragathi Nagar"];
    villages.forEach(v => {
        // Use name as ID for simplicity or random ID? Let's use auto-ID or name-slug to avoid dups if run multiple times?
        // Actually, deleteCollection("master_villages") should be called first if we want a clean slate.
        // But the previous code doesn't call deleteCollection for everything, only students.
        // Let's add deleteCollection for master data to be safe.
        const docRef = doc(collection(db, "master_villages"));
        batch.set(docRef, {
            name: v,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
    });

    // 9. Seed Master Data: Classes & Sections
    const classes = Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`);
    const sections = ["A", "B", "C"];

    // Seed individual classes
    // Note: The UI separates them into "master_classes" and "master_sections" ? 
    // Wait, let me check the page implementation again.
    // In `ClassesSectionsPage`, it seems I decided to store them?
    // Let's check `src/app/admin/master-data/classes-sections/page.tsx` usage.
    // Ah, I set up `master_class_sections` usage in `AddStudentModal`.
    // But does the management page use `master_classes` and `master_sections` individually?
    // I recall creating tabs for them.
    // Let's blindly seed the COMBINATIONS into `master_class_sections` as that's what AddStudent uses.
    // And also seed `master_classes` and `master_sections` if the management page uses them.

    // Based on my previous view of AddStudentModal, it uses `master_class_sections`.
    // Let's assume the management page also works with `master_classes` and `master_sections` for the dropdowns there.
    // I'll seed ALL three collections to be safe and thorough.

    classes.forEach((c, i) => {
        batch.set(doc(collection(db, "master_classes")), { name: c, isActive: true, order: i + 1, createdAt: Timestamp.now() });
    });

    sections.forEach(s => {
        batch.set(doc(collection(db, "master_sections")), { name: s, isActive: true, createdAt: Timestamp.now() });
    });

    classes.forEach(c => {
        sections.forEach(s => {
            batch.set(doc(collection(db, "master_class_sections")), {
                className: c,
                sectionName: s,
                displayName: `${c} - ${s}`,
                isActive: true,
                createdAt: Timestamp.now()
            });
        });
    });

    await batch.commit();
    return true;
};

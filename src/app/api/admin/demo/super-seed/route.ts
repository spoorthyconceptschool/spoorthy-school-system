import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const maxDuration = 120; // 2 minutes for a total ecosystem rebuild

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

        // --- PHASE 1: MASTER REGISTRY (RTDB) ---
        logs.push("1. Rebuilding Educational Framework (13 Classes, 2 Sections each)...");

        // CHECK FOR EXISTING BRANDING TO PRESERVE FORMATS
        const existingBrandingSnap = await adminRtdb.ref("master/branding").get();
        const existingBranding = existingBrandingSnap.exists() ? existingBrandingSnap.val() : null;

        const villages = {
            "v1": { id: "v1", name: "Ameerpet", distance: 0 },
            "v2": { id: "v2", name: "Madhapur", distance: 5 },
            "v3": { id: "v3", name: "Kukatpally", distance: 8 },
            "v4": { id: "v4", name: "Jubilee Hills", distance: 4 },
            "v5": { id: "v5", name: "Banjara Hills", distance: 6 }
        };
        const classesList = [
            { id: "nursery", name: "Nursery", order: 1 }, { id: "lkg", name: "LKG", order: 2 }, { id: "ukg", name: "UKG", order: 3 },
            { id: "c1", name: "1st Class", order: 4 }, { id: "c2", name: "2nd Class", order: 5 }, { id: "c3", name: "3rd Class", order: 6 },
            { id: "c4", name: "4th Class", order: 7 }, { id: "c5", name: "5th Class", order: 8 }, { id: "c6", name: "6th Class", order: 9 },
            { id: "c7", name: "7th Class", order: 10 }, { id: "c8", name: "8th Class", order: 11 }, { id: "c9", name: "9th Class", order: 12 },
            { id: "c10", name: "10th Class", order: 13 }
        ];
        const classes: Record<string, any> = {}; classesList.forEach(c => classes[c.id] = c);

        const sections = { "s_a": { id: "s_a", name: "Section A" }, "s_b": { id: "s_b", name: "Section B" } };
        const subjects = {
            "sub_tel": { id: "sub_tel", name: "Telugu", code: "TEL" },
            "sub_eng": { id: "sub_eng", name: "English", code: "ENG" },
            "sub_mat": { id: "sub_mat", name: "Mathematics", code: "MAT" },
            "sub_sci": { id: "sub_sci", name: "Science", code: "SCI" },
            "sub_soc": { id: "sub_soc", name: "Social Studies", code: "SOC" },
            "sub_hin": { id: "sub_hin", name: "Hindi", code: "HIN" },
            "sub_phy": { id: "sub_phy", name: "Physics", code: "PHY" },
            "sub_com": { id: "sub_com", name: "Computer", code: "COM" }
        };

        // Increase Teacher Pool for Class Teachers
        const staffPool = [
            { id: "T101", name: "Anjali Devi", email: "anjali@school.local", role: "TEACHER", subjects: ["sub_tel"] },
            { id: "T102", name: "Ramesh Kumar", email: "ramesh@school.local", role: "TEACHER", subjects: ["sub_mat"] },
            { id: "T103", name: "Sarah Wilson", email: "sarah@school.local", role: "TEACHER", subjects: ["sub_eng"] },
            { id: "T104", name: "Vikram Seth", email: "vikram@school.local", role: "TEACHER", subjects: ["sub_sci"] },
            { id: "T105", name: "Kiran Goud", email: "kiran@school.local", role: "TEACHER", subjects: ["sub_soc"] },
            { id: "T106", name: "Latha Reddy", email: "latha@school.local", role: "TEACHER", subjects: ["sub_hin"] },
            { id: "T107", name: "Prakash Jha", email: "prakash@school.local", role: "TEACHER", subjects: ["sub_phy"] },
            { id: "T108", name: "Sumati Rao", email: "sumati@school.local", role: "TEACHER", subjects: ["sub_com"] },
            { id: "T109", name: "Nidhi Agrawal", email: "nidhi@school.local", role: "TEACHER", subjects: ["sub_mat"] },
            { id: "T110", name: "Rahul Deshmukh", email: "rahul@school.local", role: "TEACHER", subjects: ["sub_eng"] },
            { id: "T111", name: "Priya Menon", email: "priya.m@school.local", role: "TEACHER", subjects: ["sub_sci"] },
            { id: "T112", name: "Arjun Pillai", email: "arjun@school.local", role: "TEACHER", subjects: ["sub_soc"] },
            { id: "T113", name: "Deepak Chawla", email: "deepak@school.local", role: "TEACHER", subjects: ["sub_hin"] },
            { id: "T114", name: "Sneha Kapoor", email: "sneha@school.local", role: "TEACHER", subjects: ["sub_phy"] },
            { id: "T115", name: "Vikrant Patil", email: "vikrant@school.local", role: "TEACHER", subjects: ["sub_com"] },
            { id: "T116", name: "Suman Kalyan", email: "suman@school.local", role: "TEACHER", subjects: ["sub_mat"] },
            { id: "T117", name: "Kavya S", email: "kavya@school.local", role: "TEACHER", subjects: ["sub_eng"] },
            { id: "T118", name: "Manish G", email: "manish@school.local", role: "TEACHER", subjects: ["sub_sci"] },
            { id: "T119", name: "Abhishek T", email: "abhishek@school.local", role: "TEACHER", subjects: ["sub_soc"] },
            { id: "T120", name: "Pooja V", email: "pooja@school.local", role: "TEACHER", subjects: ["sub_com"] },
            { id: "T121", name: "Sameer K", email: "sameer@school.local", role: "TEACHER", subjects: ["sub_tel"] },
            { id: "T122", name: "Ritu M", email: "ritu@school.local", role: "TEACHER", subjects: ["sub_mat"] },
            { id: "T123", name: "Sanjay D", email: "sanjay@school.local", role: "TEACHER", subjects: ["sub_eng"] },
            { id: "T124", name: "Meera B", email: "meera.b@school.local", role: "TEACHER", subjects: ["sub_sci"] },
            { id: "T125", name: "Varun R", email: "varun@school.local", role: "TEACHER", subjects: ["sub_soc"] },
            { id: "T126", name: "Shweta L", email: "shweta@school.local", role: "TEACHER", subjects: ["sub_hin"] },
            { id: "T127", name: "Admin User", email: "admin@school.local", role: "SUPER_ADMIN", subjects: [] }
        ];

        const classSections: Record<string, any> = {};
        const subjectTeachers: Record<string, any> = {};
        const classSubjects: Record<string, any> = {};

        classesList.forEach((c, cIdx) => {
            // Curriculums
            const isJunior = c.order <= 3;
            const gradeSubjects = isJunior ? ["sub_tel", "sub_eng", "sub_mat", "sub_com"] : Object.keys(subjects);
            const subMap: Record<string, boolean> = {}; gradeSubjects.forEach(sId => subMap[sId] = true);
            classSubjects[c.id] = subMap;

            // Sections A & B
            ["s_a", "s_b"].forEach((sId, sIdx) => {
                const csKey = `${c.id}_${sId}`;
                // Assign a unique Class Teacher for each section
                const teacherIdx = (cIdx * 2 + sIdx) % (staffPool.length - 1);
                const classTeacher = staffPool[teacherIdx];

                classSections[csKey] = {
                    id: csKey, classId: c.id, sectionId: sId,
                    active: true, classTeacherId: classTeacher.id
                };

                // Assign Subject Teachers
                subjectTeachers[csKey] = {};
                gradeSubjects.forEach((subId, subIdx) => {
                    const stIdx = (cIdx + sIdx + subIdx) % (staffPool.length - 1);
                    subjectTeachers[csKey][subId] = staffPool[stIdx].id;
                });
            });
        });

        const branding = existingBranding || {
            schoolName: "Spoorthy Concept School",
            address: "H-No: 2-3, Vidya Nagar, Hyderabad, TS",
            principalSignature: "https://firebasestorage.googleapis.com/v0/b/spoorthy-school.appspot.com/o/demo%2Fsignature.png?alt=media",
            schoolLogo: "https://firebasestorage.googleapis.com/v0/b/spoorthy-school.appspot.com/o/demo%2Flogo.png?alt=media"
        };

        await adminRtdb.ref("master").update({ villages, classes, sections, subjects, classSections, classSubjects, subjectTeachers, branding });

        // Sync to Firestore for legacy dependencies
        logs.push("... Syncing Master Data and Assignments to Firestore Cache...");
        Object.entries(classes).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_classes").doc(id), { ...data, updatedAt: Timestamp.now() }, { merge: true }));
        Object.entries(villages).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_villages").doc(id), { ...data, updatedAt: Timestamp.now() }, { merge: true }));
        Object.entries(subjects).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_subjects").doc(id), { ...data, updatedAt: Timestamp.now() }, { merge: true }));
        Object.entries(sections).forEach(([id, data]) => mainBatch.set(adminDb.collection("master_sections").doc(id), { ...data, updatedAt: Timestamp.now() }, { merge: true }));

        // Also seed Teaching Assignments (Firestore collection used by some components)
        classesList.forEach(c => {
            ["s_a", "s_b"].forEach(sId => {
                const csKey = `${c.id}_${sId}`;
                mainBatch.set(adminDb.collection("teaching_assignments").doc(`${academicYearId}_${csKey}`), {
                    classId: c.id,
                    sectionId: sId,
                    yearId: academicYearId,
                    assignments: subjectTeachers[csKey],
                    classTeacherId: classSections[csKey].classTeacherId,
                    updatedAt: Timestamp.now()
                }, { merge: true });
            });
        });

        // --- PHASE 1.5: WEBSITE CMS CONTENT (Landing Page) ---
        logs.push("... Initializing High-Performance CMS Content (Hero, Facilities, Gallery)...");
        const homeContent = {
            hero: {
                title: "The Future of Learning.",
                subtitle: "Where curiosity meets innovation in a world-class campus.",
                videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4"
            },
            facilities: {
                digital_classrooms: { title: "Digital Classrooms", desc: "Interactive smart boards with immersive content.", order: 1, image: "https://images.unsplash.com/photo-1577896338042-327704b77134?w=800&q=80", isPublished: true },
                professional_teachers: { title: "Professional Teachers", desc: "Highly qualified faculty dedicated to student growth.", order: 2, image: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&q=80", isPublished: true },
                spoken_english: { title: "Spoken English", desc: "Special emphasis on communication and confidence.", order: 3, image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80", isPublished: true },
                karate_classes: { title: "Karate Classes", desc: "Self-defense and discipline for physical fitness.", order: 4, image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&q=80", isPublished: true },
                computer_classes: { title: "Computer Classes", desc: "State-of-the-art systems for technical literacy.", order: 5, image: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&q=80", isPublished: true },
                dance_classes: { title: "Dance Classes", desc: "Creative expression through classical and modern dance.", order: 6, image: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800&q=80", isPublished: true },
                cultural_programs: { title: "Cultural Programs", desc: "Celebrating heritage through stage performances.", order: 7, image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80", isPublished: true },
            },
            leadership: {
                chairman: { name: "Anjali Devi", title: "Chairman", photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a" },
                principal: { name: "Anjali Devi", title: "Principal", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2" }
            },
            why: ["Excellence in Education", "Character Building", "Creative Expression", "Future Ready Skillset"],
            gallery: [
                "https://images.unsplash.com/photo-1560785496-3c9d27877182",
                "https://images.unsplash.com/photo-1546410531-bb4caa6b424d",
                "https://images.unsplash.com/photo-1509062522246-3755977927d7",
                "https://images.unsplash.com/photo-1596496053493-27f272c72b9a"
            ]
        };
        await adminRtdb.ref("siteContent/home").set(homeContent);

        mainBatch.set(adminDb.collection("settings").doc("branding"), branding, { merge: true });

        // --- PHASE 2: STAFF & USER ACCOUNTS ---
        logs.push("2. Creating Faculty & Staff Accounts (27 total) with Rich Profiles...");

        // Helper to generate random phone
        const randomPhone = () => `98${Math.floor(Math.random() * 90000000 + 10000000)}`;
        const qualifications = ["B.Ed, M.Sc", "M.A, B.Ed", "Ph.D", "B.Tech", "M.Com", "B.Sc, B.Ed"];

        await Promise.all(staffPool.map(async (p, idx) => {
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

            // Rich Profile Data
            const salary = 25000 + (Math.floor(Math.random() * 20) * 1000); // 25k - 45k
            const experience = Math.floor(Math.random() * 15) + 1;
            const joiningYear = 2025 - experience;
            const dobYear = 1980 + Math.floor(Math.random() * 15);

            mainBatch.set(adminDb.collection("teachers").doc(p.id), {
                name: p.name, schoolId: p.id, uid, email: p.email, status: "ACTIVE", role: p.role,
                subjects: (p as any).subjects || [],
                mobile: randomPhone(),
                address: `Flat ${101 + idx}, Teacher Colony, Hyderabad`,
                dob: `${dobYear}-05-15`,
                age: 2025 - dobYear,
                joiningDate: `${joiningYear}-06-01`,
                qualifications: qualifications[idx % qualifications.length],
                experience: `${experience} Years`,
                salary: salary,
                password: password, // Store plainly for demo reference? Or just rely on universal 'password123'
                createdAt: Timestamp.now()
            }, { merge: true });

            mainBatch.set(adminDb.collection("users").doc(uid), {
                schoolId: p.id, role: p.role, status: "ACTIVE",
                displayName: p.name, email: p.email, recoveryPassword: password
            }, { merge: true });
            mainBatch.set(adminDb.collection("usersBySchoolId").doc(p.id), { uid, role: p.role }, { merge: true });
        }));

        // --- PHASE 1.8: GROUPS (HOUSES) ---
        logs.push("... Creating 4 Default Student Groups (Houses)...");
        const defaultGroups = [
            { id: "group_red", name: "Red House", code: "RED", color: "#ff4d4d" },
            { id: "group_blue", name: "Blue House", code: "BLUE", color: "#4d79ff" },
            { id: "group_green", name: "Green House", code: "GREEN", color: "#00cc66" },
            { id: "group_yellow", name: "Yellow House", code: "YELLOW", color: "#ffcc00" }
        ];

        defaultGroups.forEach(g => {
            mainBatch.set(adminDb.collection("groups").doc(g.id), {
                ...g,
                createdAt: Timestamp.now()
            }, { merge: true });
        });

        // --- PHASE 3: STUDENTS DIRECTORY (10 Per Section, 13 Classes * 2 Sections = 260 total) ---
        logs.push("3. Mass Enrollment: 260 Students (10 per Section, 26 Rooms)...");
        const students: any[] = [];
        const studentFirstNames = ["Arun", "Deepika", "Vihaan", "Ananya", "Kabir", "Meera", "Rohan", "Priya", "Ishaan", "Zoya", "Aditya", "Saanvi", "Reyansh", "Diya", "Sai", "Myra", "Shaurya", "Anvith", "Kiara", "Aryan", "Advait", "Ishani", "Karthik", "Sneha", "Rahul", "Tanvi"];
        const studentLastNames = ["Kumar", "Rani", "Singh", "Pillai", "Khan", "Reddy", "Das", "Malik", "Jha", "Ahmed", "Varma", "Sharma", "Goud", "Patel", "Naidu", "Bose", "Joshi", "Iyer", "Nair", "Mishra"];

        classesList.forEach(c => {
            ["s_a", "s_b"].forEach(sId => {
                for (let k = 1; k <= 10; k++) {
                    const sCount = students.length + 1;
                    const sid = `S${1000 + sCount}`;
                    const fName = studentFirstNames[(sCount + k) % studentFirstNames.length];
                    const lName = studentLastNames[(sCount + k) % studentLastNames.length];
                    const name = `${fName} ${lName}`;
                    const village = villages[`v${(sCount % 5) + 1}` as keyof typeof villages];

                    const group = defaultGroups[sCount % 4];

                    students.push({
                        id: sid, name, email: `${fName.toLowerCase()}.${sid.toLowerCase()}@school.local`,
                        classId: c.id, className: c.name, sectionId: sId, sectionName: sections[sId as keyof typeof sections].name,
                        villageId: village.id, villageName: village.name, transportRequired: village.id !== "v1",
                        groupId: group.id, groupName: group.name, groupColor: group.color
                    });
                }
            });
        });

        // Fast-track Auth for 260 students (use fewer promises or sequential chunking if needed, but Firebase Admin is fast)
        logs.push("... Processing student credentials in bulk...");
        // For 260 students, we'll use chunks to avoid Firestore quota bursts
        const studentChunks = [];
        for (let i = 0; i < students.length; i += 50) studentChunks.push(students.slice(i, i + 50));

        for (const chunk of studentChunks) {
            await Promise.all(chunk.map(async (s) => {
                let uid;
                try {
                    const user = await adminAuth.createUser({ email: s.email, password, displayName: s.name });
                    uid = user.uid;
                    await adminAuth.setCustomUserClaims(uid, { role: "STUDENT" });
                } catch (e: any) {
                    if (e.code === 'auth/email-already-exists') {
                        const user = await adminAuth.getUserByEmail(s.email);
                        uid = user.uid;
                    } else return; // Skip failed
                }

                mainBatch.set(adminDb.collection("students").doc(s.id), {
                    studentName: s.name, schoolId: s.id, uid,
                    classId: s.classId, className: s.className, sectionId: s.sectionId, sectionName: s.sectionName,
                    villageId: s.villageId, villageName: s.villageName, transportRequired: s.transportRequired,
                    status: "ACTIVE", parentName: "Parent of " + s.name, parentMobile: "98765432" + s.id.substring(1),
                    groupId: s.groupId, groupName: s.groupName, groupColor: s.groupColor,
                    recoveryPassword: password, createdAt: Timestamp.now()
                }, { merge: true });

                mainBatch.set(adminDb.collection("users").doc(uid), {
                    schoolId: s.id, role: "STUDENT", status: "ACTIVE", displayName: s.name, email: s.email, recoveryPassword: password
                }, { merge: true });
                mainBatch.set(adminDb.collection("usersBySchoolId").doc(s.id), { uid, role: "STUDENT" }, { merge: true });
            }));
        }

        // --- PHASE 4: FINANCIALS & ANALYTICS ---
        logs.push("4. Generating 260 Dynamic Ledgers and Analytics...");
        const feeTermsDef = [
            { id: "term_adm", name: "Admission Fee", dueDate: "2025-06-01", isActive: true },
            { id: "term_1", name: "Term 1", dueDate: "2025-06-15", isActive: true },
            { id: "term_2", name: "Term 2", dueDate: "2025-10-15", isActive: true }
        ];
        mainBatch.set(adminDb.collection("config").doc("fees"), { terms: feeTermsDef, updatedAt: Timestamp.now() });

        students.forEach((s, idx) => {
            const fees = feeTermsDef.map(t => ({
                id: `TERM_${t.id}`, type: "TERM", name: t.name, dueDate: t.dueDate,
                amount: s.classId === "c10" ? 15000 : 10000, paidAmount: idx % 5 === 0 ? (s.classId === "c10" ? 15000 : 10000) : 0,
                status: idx % 5 === 0 ? "PAID" : "PENDING"
            }));
            const totalFee = fees.reduce((acc, curr) => acc + curr.amount, 0);
            const totalPaid = fees.reduce((acc, curr) => acc + curr.paidAmount, 0);

            mainBatch.set(adminDb.collection("student_fee_ledgers").doc(`${s.id}_${academicYearId}`), {
                studentId: s.id, studentName: s.name, className: s.className, academicYearId,
                totalFee, totalPaid, status: totalPaid >= totalFee ? "PAID" : "PENDING", items: fees, updatedAt: Timestamp.now()
            }, { merge: true });
        });

        // --- PHASE 5: TIMETABLES (NEW) ---
        logs.push("5. Generating Timetables for 26 Sections & 27 Teachers...");
        const masterTeacherSchedules: Record<string, any> = {};

        classesList.forEach((c) => {
            ["s_a", "s_b"].forEach((sId) => {
                const csKey = `${c.id}_${sId}`;
                const classTimetable: Record<string, any> = {};
                const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const subjectList = Object.keys(classSubjects[c.id]);

                days.forEach((day, dIdx) => {
                    classTimetable[day] = {};
                    for (let slot = 1; slot <= 8; slot++) {
                        // Round robin subject selection
                        const subId = subjectList[(dIdx + slot) % subjectList.length];
                        const tId = subjectTeachers[csKey][subId];

                        if (tId) {
                            classTimetable[day][`P${slot}`] = { subjectId: subId, teacherId: tId };

                            // Update Teacher Schedule
                            if (!masterTeacherSchedules[tId]) masterTeacherSchedules[tId] = {};
                            if (!masterTeacherSchedules[tId][day]) masterTeacherSchedules[tId][day] = {};

                            // Simple conflict resolution: Overwrite (it's a demo seed)
                            masterTeacherSchedules[tId][day][`P${slot}`] = { classId: c.id, sectionId: sId, subjectId: subId };
                        }
                    }
                });

                // Write Class Timetable
                mainBatch.set(adminDb.collection("class_timetables").doc(`${academicYearId}_${c.id}_${sId}`), {
                    yearId: academicYearId, classId: c.id, sectionId: sId, schedule: classTimetable, status: "PUBLISHED", updatedAt: Timestamp.now()
                });
            });
        });

        // Write Teacher Schedules
        Object.entries(masterTeacherSchedules).forEach(([tId, schedule]) => {
            mainBatch.set(adminDb.collection("teacher_schedules").doc(`${academicYearId}_${tId}`), {
                schedule, updatedAt: Timestamp.now()
            });
        });




        // --- PHASE 6: FINALIZING ---
        logs.push("6. Finalizing Ecosystem...");
        mainBatch.set(adminDb.collection("settings").doc("branding"), branding, { merge: true });

        await mainBatch.commit();
        const duration = (Date.now() - startTime) / 1000;
        logs.push(`SUCCESS: 13 Classes, 26 Sections, 27 Staff, 260 Students, Fully Populated Timetables and Ledgers in ${duration}s.`);
        return NextResponse.json({ success: true, message: "Large Scale School Rebuild Complete", duration: `${duration}s`, logs });

    } catch (error: any) {
        console.error("Super Seed Error:", error);
        return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });
    }
}

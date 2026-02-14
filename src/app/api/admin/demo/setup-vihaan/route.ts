import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
    try {
        const batch = adminDb.batch();
        const yearId = "2025-2026";

        // 1. Create/Find Subject: Maths & Science
        let mathsId = "subject_maths";
        let scienceId = "subject_science";

        const mathsRef = adminDb.collection("subjects").doc(mathsId);
        batch.set(mathsRef, { name: "Mathematics", code: "MATHS", type: "THEORY" }, { merge: true });

        const scienceRef = adminDb.collection("subjects").doc(scienceId);
        batch.set(scienceRef, { name: "Science", code: "SCI", type: "THEORY" }, { merge: true });

        // 2. Create/Find Class: 10-A
        const classId = "class_10_a";
        const classRef = adminDb.collection("classes").doc(classId);
        batch.set(classRef, { name: "Class 10", section: "A", grade: 10 }, { merge: true });

        // 3. Create Teachers: Vihaan & Substitute
        // Vihaan Goud
        const vihaanSnap = await adminDb.collection("teachers").where("name", "==", "Vihaan Goud").get();
        let vihaanId;
        let vihaanUid;

        if (!vihaanSnap.empty) {
            vihaanId = vihaanSnap.docs[0].id;
            vihaanUid = vihaanSnap.docs[0].data().uid;
        } else {
            const newRef = adminDb.collection("teachers").doc();
            vihaanId = newRef.id;
            // Create Auth
            try {
                const user = await adminAuth.createUser({
                    email: "vihaan@school.local",
                    password: "password123",
                    displayName: "Vihaan Goud"
                });
                vihaanUid = user.uid;
                await adminAuth.setCustomUserClaims(vihaanUid, { role: "TEACHER" });
            } catch (e: any) {
                // If user exists but not in DB, try to find
                if (e.code === 'auth/email-already-exists') {
                    const user = await adminAuth.getUserByEmail("vihaan@school.local");
                    vihaanUid = user.uid;
                } else throw e;
            }

            batch.set(newRef, {
                name: "Vihaan Goud",
                email: "vihaan@school.local",
                schoolId: "T2026001",
                uid: vihaanUid,
                status: "ACTIVE",
                role: "TEACHER",
                subjects: [mathsId]
            });
        }

        // Substitute Teacher (Teja)
        const subSnap = await adminDb.collection("teachers").where("name", "==", "Teja Substitute").get();
        let subId;
        if (!subSnap.empty) {
            subId = subSnap.docs[0].id;
        } else {
            const newRef = adminDb.collection("teachers").doc();
            subId = newRef.id;
            // Create Auth
            let subUid;
            try {
                const user = await adminAuth.createUser({
                    email: "teja@school.local",
                    password: "password123",
                    displayName: "Teja Substitute"
                });
                subUid = user.uid;
                await adminAuth.setCustomUserClaims(subUid, { role: "TEACHER" });
            } catch (e: any) {
                if (e.code === 'auth/email-already-exists') {
                    const user = await adminAuth.getUserByEmail("teja@school.local");
                    subUid = user.uid;
                } else throw e;
            }

            batch.set(newRef, {
                name: "Teja Substitute",
                email: "teja@school.local",
                schoolId: "T2026002",
                uid: subUid,
                status: "ACTIVE",
                role: "TEACHER",
                subjects: [scienceId]
            });
        }

        // 4. Assign Teachers to Class
        const assignmentRef = adminDb.collection("teaching_assignments").doc(`${yearId}_${classId}`);
        batch.set(assignmentRef, {
            yearId,
            classId,
            assignments: {
                [mathsId]: vihaanId,
                [scienceId]: subId
            },
            updatedAt: FieldValue.serverTimestamp()
        });

        // 5. Create Timetables
        // Vihaan teaches Slot 1 (09:00-10:00) Everyday
        // Teja teaches Slot 2 (10:00-11:00) Everyday
        // This ensures Teja is FREE during Slot 1 to substitute Vihaan.

        const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
        const classSchedule: any = {};
        const vihaanSchedule: any = {};
        const subSchedule: any = {};

        days.forEach(day => {
            if (!classSchedule[day]) classSchedule[day] = {};
            if (!vihaanSchedule[day]) vihaanSchedule[day] = {};
            if (!subSchedule[day]) subSchedule[day] = {};

            // Slot 1: Maths (Vihaan)
            classSchedule[day]["1"] = { subjectId: mathsId, teacherId: vihaanId, startTime: "09:00", endTime: "10:00" };
            vihaanSchedule[day]["1"] = { classId, subjectId: mathsId, startTime: "09:00", endTime: "10:00" };

            // Slot 2: Science (Teja)
            classSchedule[day]["2"] = { subjectId: scienceId, teacherId: subId, startTime: "10:00", endTime: "11:00" };
            subSchedule[day]["2"] = { classId, subjectId: scienceId, startTime: "10:00", endTime: "11:00" };
        });

        // Write Class Timetable
        const classTtRef = adminDb.collection("class_timetables").doc(`${yearId}_${classId}`);
        batch.set(classTtRef, {
            yearId,
            classId,
            schedule: classSchedule,
            status: "PUBLISHED"
        });

        // Write Teacher Schedules
        const vihaanTtRef = adminDb.collection("teacher_schedules").doc(`${yearId}_${vihaanId}`);
        batch.set(vihaanTtRef, { schedule: vihaanSchedule });

        const subTtRef = adminDb.collection("teacher_schedules").doc(`${yearId}_${subId}`);
        batch.set(subTtRef, { schedule: subSchedule });

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: "Setup Complete for Vihaan Goud",
            details: {
                teacher: { name: "Vihaan Goud", email: "vihaan@school.local", password: "password123", id: vihaanId },
                substitute: { name: "Teja Substitute", id: subId },
                class: "Class 10-A",
                schedule: "Vihaan has Slot 1 (9-10 AM) daily. Teja has Slot 2."
            }
        });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

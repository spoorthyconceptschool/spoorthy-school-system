import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
    const logs: string[] = [];
    try {
        logs.push("Starting setup-logins API...");

        if (!adminDb || !adminAuth) {
            logs.push("ERROR: Firebase Admin not initialized. Check environment variables.");
            return NextResponse.json({ success: false, error: "Firebase Admin not initialized", logs }, { status: 500 });
        }

        const results = {
            teachers: 0,
            students: 0,
            errors: [] as string[]
        };

        const password = "password123";

        // 0. Ensure Admin exists
        const adminEmail = "admin@spoorthy.edu";
        try {
            await adminAuth.getUserByEmail(adminEmail);
            logs.push(`Admin account ${adminEmail} already exists.`);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                logs.push(`Creating Admin account: ${adminEmail}`);
                const adminRecord = await adminAuth.createUser({
                    email: adminEmail,
                    password: password,
                    displayName: "School Administrator"
                });
                await adminAuth.setCustomUserClaims(adminRecord.uid, { role: "ADMIN" });
                logs.push("Admin account created successfully.");
            } else {
                throw e;
            }
        }

        // 1. Process Teachers
        logs.push("Fetching teachers...");
        const teachersSnap = await adminDb.collection("teachers").get();
        logs.push(`Found ${teachersSnap.size} teacher documents.`);

        for (const doc of teachersSnap.docs) {
            const data = doc.data();
            if (!data.uid) {
                try {
                    const schoolId = data.schoolId || doc.id;
                    const email = `${schoolId}@school.local`.toLowerCase();
                    const name = data.name || "Teacher";

                    logs.push(`Creating Auth for Teacher: ${schoolId} (${email})`);

                    try {
                        const userRecord = await adminAuth.createUser({
                            email,
                            password,
                            displayName: name
                        });

                        const uid = userRecord.uid;
                        await adminAuth.setCustomUserClaims(uid, { role: "TEACHER" });

                        // Update Teacher Profile
                        await doc.ref.update({
                            uid,
                            recoveryPassword: password,
                            updatedAt: Timestamp.now()
                        });

                        // Create User Doc
                        await adminDb.collection("users").doc(uid).set({
                            schoolId,
                            role: "TEACHER",
                            status: "ACTIVE",
                            mustChangePassword: false,
                            recoveryPassword: password,
                            createdAt: Timestamp.now()
                        });

                        // Map by School ID
                        await adminDb.collection("usersBySchoolId").doc(schoolId).set({
                            uid,
                            role: "TEACHER"
                        });

                        results.teachers++;
                        logs.push(`Successfully created login for ${schoolId}`);
                    } catch (authError: any) {
                        if (authError.code === 'auth/email-already-exists') {
                            logs.push(`Auth already exists for ${email}. Fetching existing user...`);
                            const existingUser = await adminAuth.getUserByEmail(email);
                            const uid = existingUser.uid;

                            // Link existing UID to profile if missing
                            await doc.ref.update({ uid });
                            logs.push(`Linked existing Auth UID to Teacher ${schoolId}`);
                        } else {
                            throw authError;
                        }
                    }
                } catch (e: any) {
                    results.errors.push(`Teacher ${doc.id}: ${e.message}`);
                    logs.push(`ERROR processing teacher ${doc.id}: ${e.message}`);
                }
            } else {
                logs.push(`Teacher ${data.schoolId} already has UID: ${data.uid}`);
            }
        }

        // 2. Process Students
        logs.push("Fetching students (limited to 20)...");
        const studentsSnap = await adminDb.collection("students").limit(20).get();
        logs.push(`Found ${studentsSnap.size} student documents.`);

        for (const doc of studentsSnap.docs) {
            const data = doc.data();
            if (!data.uid) {
                try {
                    const schoolId = data.schoolId || doc.id;
                    const email = `${schoolId}@school.local`.toLowerCase();
                    const name = data.studentName || "Student";

                    logs.push(`Creating Auth for Student: ${schoolId}`);

                    try {
                        const userRecord = await adminAuth.createUser({
                            email,
                            password,
                            displayName: name
                        });

                        const uid = userRecord.uid;
                        await adminAuth.setCustomUserClaims(uid, { role: "STUDENT" });

                        // Update Student Profile
                        await doc.ref.update({
                            uid,
                            recoveryPassword: password,
                            updatedAt: Timestamp.now()
                        });

                        // Create User Doc
                        await adminDb.collection("users").doc(uid).set({
                            schoolId,
                            role: "STUDENT",
                            status: "ACTIVE",
                            mustChangePassword: false,
                            recoveryPassword: password,
                            createdAt: Timestamp.now()
                        });

                        // Map by School ID
                        await adminDb.collection("usersBySchoolId").doc(schoolId).set({
                            uid,
                            role: "STUDENT"
                        });

                        results.students++;
                        logs.push(`Successfully created login for Student ${schoolId}`);
                    } catch (authErr: any) {
                        if (authErr.code === 'auth/email-already-exists') {
                            const existing = await adminAuth.getUserByEmail(email);
                            await doc.ref.update({ uid: existing.uid });
                            logs.push(`Linked existing Auth UID to Student ${schoolId}`);
                        } else {
                            throw authErr;
                        }
                    }
                } catch (e: any) {
                    results.errors.push(`Student ${doc.id}: ${e.message}`);
                    logs.push(`ERROR processing student ${doc.id}: ${e.message}`);
                }
            } else {
                logs.push(`Student ${data.schoolId} already has UID.`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Created ${results.teachers} teachers and ${results.students} student logins.`,
            results,
            logs,
            password
        });

    } catch (error: any) {
        logs.push(`CRITICAL API ERROR: ${error.message}`);
        console.error("Setup Logins Error:", error);
        return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });
    }
}

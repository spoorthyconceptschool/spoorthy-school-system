
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.error("Missing FIREBASE_PRIVATE_KEY");
    process.exit(1);
}

// Init Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
    });
}

const auth = admin.auth();
const db = admin.firestore();

async function main() {
    console.log("Setting up test users...");

    // 1. Create/Update Admin
    const adminEmail = "verify-admin@spoorthy.edu";
    const adminPass = "password123";
    let adminUid;

    try {
        const user = await auth.getUserByEmail(adminEmail);
        adminUid = user.uid;
        await auth.updateUser(adminUid, { password: adminPass });
        console.log("Admin user exists, updated password.");
    } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            const user = await auth.createUser({
                email: adminEmail,
                password: adminPass,
                displayName: "Verify Admin"
            });
            adminUid = user.uid;
            console.log("Admin user created.");
        } else {
            throw e;
        }
    }

    // Set Admin Role
    await auth.setCustomUserClaims(adminUid, { role: 'admin' });
    console.log("Admin claims set.");

    // 2. Create Dummy Student
    const studentEmail = "delete-me@school.local";
    const studentPass = "password123";
    const studentId = "SHS-DELETE-ME";
    let studentUid;

    try {
        const user = await auth.getUserByEmail(studentEmail);
        studentUid = user.uid;
        console.log("Test student exists.");
    } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            const user = await auth.createUser({
                email: studentEmail,
                password: studentPass,
                displayName: "Delete Me Student"
            });
            studentUid = user.uid;
            console.log("Test student created.");
        } else {
            throw e;
        }
    }

    // Add to Firestore
    await db.collection('students').doc(studentId).set({
        studentName: "Delete Me Student",
        schoolId: studentId,
        role: "student",
        uid: studentUid,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        parentName: "Test Parent",
        parentMobile: "9999999999",
        className: "Class X",
        classId: "class-x",
        sectionName: "A"
    });
    console.log("Test student Firestore doc created.");

    console.log("Setup complete.");
}

main().catch(console.error);

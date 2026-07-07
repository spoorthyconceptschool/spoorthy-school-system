import { adminDb } from "../src/lib/firebase-admin";

async function checkUserBranch() {
    const snap = await adminDb.collection('users').get();
    snap.docs.forEach((doc: any) => {
        const d = doc.data();
        if (d.role === "ADMIN" || d.role === "SUPER_ADMIN") {
            console.log(d.email, '=> branchId:', d.branchId, 'schoolId:', d.schoolId);
        }
    });
}

checkUserBranch().then(() => process.exit(0));

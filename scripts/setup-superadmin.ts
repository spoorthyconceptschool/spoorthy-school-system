import { adminAuth, adminDb } from "../src/lib/firebase-admin";

async function setupSuperAdmin() {
    const email = "spoorthy@school.local";
    const password = "Admin@123";
    let uid;

    try {
        const user = await adminAuth.getUserByEmail(email);
        uid = user.uid;
        await adminAuth.updateUser(uid, { password });
        console.log("Super Admin user exists, updated password.");
    } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            const user = await adminAuth.createUser({
                email,
                password,
                displayName: "Super Admin"
            });
            uid = user.uid;
            console.log("Super Admin user created.");
        } else {
            throw e;
        }
    }

    await adminAuth.setCustomUserClaims(uid, { role: 'SUPER_ADMIN' });
    console.log("Super Admin claims set.");
    
    await adminDb.collection('users').doc(uid).set({
        email,
        role: 'SUPER_ADMIN',
        name: 'Super Admin',
        createdAt: new Date().toISOString()
    });
    console.log("Super Admin firestore document created.");

    console.log(`\nSUPER ADMIN ACCOUNT SETUP SUCCESSFUL!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

setupSuperAdmin().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

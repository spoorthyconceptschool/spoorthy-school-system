import { adminAuth, adminDb, adminRtdb } from "../src/lib/firebase-admin";

async function run() {
    console.log("STARTING NUCLEAR WIPE...");

    // 1. Auth Wipe
    console.log("Deleting all Auth users...");
    let pageToken;
    let count = 0;
    do {
        const result: any = await adminAuth.listUsers(1000, pageToken);
        const uids = result.users.map((u: any) => u.uid);
        if (uids.length > 0) {
            await adminAuth.deleteUsers(uids);
            count += uids.length;
            console.log(`Deleted ${count} auth users...`);
        }
        pageToken = result.pageToken;
    } while (pageToken);

    // 2. Clear Realtime DB just in case
    console.log("Wiping RTDB...");
    try {
        await adminRtdb.ref("/").remove();
    } catch (e) {}

    // 3. Re-create super admin
    console.log("Recreating Super Admin...");
    const user = await adminAuth.createUser({
        email: "spoorthy@school.local",
        password: "Password123!",
        displayName: "Super Admin"
    });
    await adminAuth.setCustomUserClaims(user.uid, { role: "SUPER_ADMIN" });
    await adminDb.collection("users").doc(user.uid).set({
        email: "spoorthy@school.local",
        role: "SUPER_ADMIN",
        name: "Super Admin",
        status: "ACTIVE",
        createdAt: new Date().toISOString()
    });
    console.log("Super Admin recreated with UID:", user.uid);
    console.log("ALL DONE.");
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});

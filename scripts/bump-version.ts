import { adminDb, adminRtdb } from "../src/lib/firebase-admin";

async function incrementVersion() {
    const version = Date.now();

    // 1. Sync to Firestore (for record keeping)
    const fsRef = adminDb.collection("config").doc("system");
    await fsRef.set({ liveVersion: version }, { merge: true });

    // 2. Sync to RTDB (for real-time push to clients)
    if (adminRtdb) {
        await adminRtdb.ref('system/liveVersion').set(version);
    }

    console.log(`System version bumped to ${version}. Clients will be prompted to update.`);
    process.exit(0);
}

incrementVersion().catch((err) => {
    console.error(err);
    process.exit(1);
});

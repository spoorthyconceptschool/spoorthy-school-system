
import { adminDb } from "../src/lib/firebase-admin";

async function incrementVersion() {
    const ref = adminDb.collection("config").doc("system");
    await ref.set({ liveVersion: Date.now() }, { merge: true });
    console.log("System version updated to trigger live update prompt.");
}

incrementVersion().catch(console.error);

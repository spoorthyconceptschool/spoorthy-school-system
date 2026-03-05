import { adminAuth } from "./src/lib/firebase-admin";

async function run() {
    try {
        console.log("Testing proxy with fake token...");
        await adminAuth.verifyIdToken("fake-token");
        console.log("Success (unexpected)");
    } catch (e: any) {
        console.error("Error thrown by verifyIdToken:");
        console.error(e.message || String(e));
    }
}
run();

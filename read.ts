import { adminDb, adminRtdb } from "./src/lib/firebase-admin";
async function read() {
    console.log("Firestore settings/branding:", (await adminDb.collection("settings").doc("branding").get()).data());
    console.log("RTDB siteContent/branding:", (await adminRtdb.ref("siteContent/branding").get()).val());
    process.exit(0);
}
read().catch(console.error);

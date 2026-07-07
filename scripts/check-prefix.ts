import { adminDb } from "../src/lib/firebase-admin";

async function checkPrefix() {
    const snap = await adminDb.collection("branding").get();
    snap.docs.forEach((doc: any) => {
        console.log(`Branding doc ${doc.id}:`, doc.data().studentIdPrefix);
    });
}
checkPrefix().then(() => process.exit(0)).catch(console.error);

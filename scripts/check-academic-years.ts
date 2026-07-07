import { adminDb } from "../src/lib/firebase-admin";

async function run() {
    const docSnap = await adminDb.collection("config").doc("academic_years").get();
    if (docSnap.exists) {
        console.log("Academic Years Config:", JSON.stringify(docSnap.data(), null, 2));
    } else {
        console.log("Academic Years Config document does NOT exist!");
    }
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

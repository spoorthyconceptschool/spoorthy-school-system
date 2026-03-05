require('ts-node').register({
    compilerOptions: { module: 'commonjs' }
});
const { adminDb } = require('./src/lib/firebase-admin');

async function fix() {
    console.log("Fixing Teacher Counter...");
    const counterRef = adminDb.collection("counters").doc("teachers");
    await counterRef.set({ count: 0 }, { merge: true });
    console.log("Counter set to 0.");

    console.log("Cleaning up SHST0NaN...");
    try {
        await adminDb.collection('teachers').doc('SHST0NaN').delete();
        await adminDb.collection('search_index').doc('SHST0NaN').delete();
        await adminDb.collection('usersBySchoolId').doc('SHST0NaN').delete();
        console.log("Deleted SHST0NaN from collections.");
    } catch (e) {
        console.log("SHST0NaN not found or already deleted.");
    }

    console.log("Cleanup complete. Next teacher will be SHST0001.");
}
fix().catch(console.error);

import { adminDb } from "../src/lib/firebase-admin";
import * as fs from 'fs';

async function run() {
    const snap = await adminDb.collection("branches").get();
    const branches: any[] = [];
    snap.forEach((doc: any) => {
        branches.push({ id: doc.id, ...doc.data() });
    });
    fs.writeFileSync('./branches_dump.json', JSON.stringify(branches, null, 2));
    console.log("Dumped", branches.length, "branches to branches_dump.json");
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

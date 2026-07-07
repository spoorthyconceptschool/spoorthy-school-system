import { adminDb } from "../src/lib/firebase-admin";
import * as fs from 'fs';

async function run() {
    const snap = await adminDb.collection("users").get();
    const users: any[] = [];
    snap.forEach((doc: any) => {
        users.push({ id: doc.id, ...doc.data() });
    });
    fs.writeFileSync('./users_dump.json', JSON.stringify(users, null, 2));
    console.log("Dumped", users.length, "users to users_dump.json");
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

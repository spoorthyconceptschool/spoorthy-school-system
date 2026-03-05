const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function dumpClassesRaw() {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

        if (!privateKey || !clientEmail) {
            console.error("Missing credentials in .env.local");
            return;
        }

        privateKey = privateKey.replace(/\\n/g, '\n');
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                databaseURL
            });
        }

        const db = admin.database();
        const classesRef = db.ref('master/classes');
        const snapshot = await classesRef.once('value');
        console.log(JSON.stringify(snapshot.val(), null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

dumpClassesRaw();

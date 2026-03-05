const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function debugClasses() {
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
        const classes = snapshot.val();

        console.log("Current Classes in RTDB:");
        if (!classes) {
            console.log("No classes found.");
        } else {
            const sortedClasses = Object.values(classes).sort((a, b) => (a.order || 0) - (b.order || 0));
            sortedClasses.forEach(c => {
                console.log(`- ID: ${c.id}, Name: ${c.name}, Order: ${c.order}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error("Error debugging classes:", error);
        process.exit(1);
    }
}

debugClasses();

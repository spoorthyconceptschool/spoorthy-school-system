const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function searchRTDB() {
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
        const masterRef = db.ref('master');
        const snapshot = await masterRef.once('value');
        const data = snapshot.val();

        console.log("Searching for '10' in master data...");
        const findings = [];

        function traverse(obj, path = 'master') {
            if (!obj) return;
            if (typeof obj === 'string') {
                if (obj.includes('10')) {
                    findings.push({ path, value: obj });
                }
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach(key => {
                    traverse(obj[key], `${path}/${key}`);
                });
            }
        }

        traverse(data);

        console.log("Findings:");
        console.log(JSON.stringify(findings, null, 2));

        process.exit(0);
    } catch (error) {
        console.error("Error searching RTDB:", error);
        process.exit(1);
    }
}

searchRTDB();

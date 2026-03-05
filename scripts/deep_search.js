const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function deepSearch() {
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
        console.log('Searching for "10th" or "10 th" in the entire RTDB...');
        const snapshot = await db.ref('/').once('value');
        const data = snapshot.val();

        const results = [];
        function traverse(obj, path = '') {
            if (!obj) return;
            if (typeof obj === 'string') {
                if (obj.toLowerCase().includes('10th') || obj.toLowerCase().includes('10 th')) {
                    results.push({ path, value: obj });
                }
            } else if (typeof obj === 'object') {
                for (const key in obj) {
                    traverse(obj[key], `${path}/${key}`);
                }
            }
        }

        traverse(data);
        console.log('Results:');
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

deepSearch();

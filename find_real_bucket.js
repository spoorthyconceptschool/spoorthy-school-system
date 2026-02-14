const admin = require('firebase-admin');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split(/\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts[1].trim().replace(/^"|"$/g, '');
});

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}

async function list() {
    try {
        const [buckets] = await admin.storage().getBuckets();
        console.log("ACTUAL_BUCKETS_START");
        buckets.forEach(b => console.log(b.name));
        console.log("ACTUAL_BUCKETS_END");
    } catch (e) {
        console.error("LIST_FAILED: " + e.message);
    }
}

list();

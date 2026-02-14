const admin = require('firebase-admin');
const fs = require('fs');

async function run() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            env[key] = value;
        }
    });

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: env.FIREBASE_CLIENT_EMAIL,
                privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            })
        });

        console.log("INITIALIZED_OK");

        // This requires the "Service Account Token Creator" or broad "Storage Admin"
        const [buckets] = await admin.storage().getBuckets();
        console.log("BUCKETS_FOUND:");
        buckets.forEach(b => console.log(b.name));
    } catch (e) {
        console.log("ERROR_DIAG: " + e.message);
    }
}

run();

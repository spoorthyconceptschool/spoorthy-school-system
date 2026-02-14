const admin = require('firebase-admin');
const fs = require('fs');

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

const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
});

async function create() {
    const bucketName = `${projectId}.appspot.com`;
    console.log(`Attempting to create default bucket: ${bucketName}`);
    try {
        const bucket = admin.storage().bucket(bucketName);
        console.log("Bucket wrapper obtained. Creating...");
        await bucket.create({
            location: 'asia-south1',
        });
        console.log("SUCCESS_CREATE");
    } catch (e) {
        console.log("FAIL_CREATE");
        console.log(e.message);
    }
    process.exit(0);
}

create();

const admin = require('firebase-admin');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[match[1]] = value;
    }
});

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
});

// For firebase-admin v13, storage() returns a Storage object from @google-cloud/storage
// But sometimes it needs to be accessed via the app or specifically.
async function run() {
    try {
        const bucket = admin.storage().bucket();
        // The bucket object itself has a .storage property which is the Storage client
        const storage = bucket.storage;
        const [buckets] = await storage.getBuckets();
        console.log("SUCCESS");
        buckets.forEach(b => console.log(b.name));
    } catch (e) {
        console.log("ERROR");
        console.log(e.message);
    }
    process.exit(0);
}

run();

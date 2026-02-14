const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

async function run() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts[1].trim().replace(/^"|"$/g, '');
        }
    });

    const storage = new Storage({
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        credentials: {
            client_email: env.FIREBASE_CLIENT_EMAIL,
            private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }
    });

    try {
        console.log("LISTING_BUCKETS...");
        const [buckets] = await storage.getBuckets();
        console.log("FOUND_COUNT: " + buckets.length);
        buckets.forEach(b => {
            console.log("BUCKET: " + b.name);
        });
    } catch (e) {
        console.error("GCP_LIST_FAILED: " + e.message);
    }
}

run();

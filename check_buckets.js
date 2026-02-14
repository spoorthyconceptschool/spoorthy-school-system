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

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
});

async function run() {
    const names = [
        'spoorthy-school-daa68.appspot.com',
        'spoorthy-school-daa68.firebasestorage.app',
        'spoorthy-school-daa68'
    ];
    console.log("START_CHECK");
    for (const name of names) {
        try {
            const bucket = admin.storage().bucket(name);
            const [exists] = await bucket.exists();
            if (exists) {
                console.log(`FOUND: ${name}`);
            } else {
                console.log(`MISSING: ${name}`);
            }
        } catch (e) {
            console.log(`FAIL_${name}: ${e.message}`);
        }
    }
    console.log("END_CHECK");
    process.exit(0);
}

run();

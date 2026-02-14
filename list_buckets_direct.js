const { Storage } = require('./node_modules/@google-cloud/storage');
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

const storage = new Storage({
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    credentials: {
        client_email: env.FIREBASE_CLIENT_EMAIL,
        private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
});

storage.getBuckets().then(([buckets]) => {
    console.log("LIST_START");
    buckets.forEach(b => console.log(b.name));
    console.log("LIST_END");
    process.exit(0);
}).catch(e => {
    console.log("LIST_FAIL");
    console.log(e.message);
    process.exit(0);
});

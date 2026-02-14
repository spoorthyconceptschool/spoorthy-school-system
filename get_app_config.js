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
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
const appId = env.NEXT_PUBLIC_FIREBASE_APP_ID;

admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
    })
});

async function getConfig() {
    try {
        console.log(`Getting config for App ID: ${appId}`);
        const config = await admin.projectManagement().getWebApp(appId).getConfig();
        console.log("FOUND_CONFIG:");
        console.log(JSON.stringify(config, null, 2));
    } catch (e) {
        console.error("Error getting config:", e.message);
    }
    process.exit(0);
}

getConfig();

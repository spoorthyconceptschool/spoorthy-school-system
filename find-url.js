const admin = require('firebase-admin');
const fs = require('fs');
const https = require('https');

// 1. Read .env.local manually
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

const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

if (!clientEmail || !privateKey) {
    console.error('Missing credentials');
    process.exit(1);
}

// 2. Initialize Admin SDK
admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
    })
});

// 3. Expanded URLs to test
const candidates = [
    `https://${projectId}.firebaseio.com/`,
    `https://${projectId}-default-rtdb.firebaseio.com/`,
    `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app/`,
    `https://${projectId}-default-rtdb.asia-south1.firebasedatabase.app/`, // Mumbai
    `https://${projectId}-default-rtdb.us-central1.firebasedatabase.app/`,
    `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/`
];

// 4. Test function
async function checkUrl(url) {
    return new Promise(async (resolve) => {
        try {
            // Use Application Default Credentials or the initialized app credential
            const tokenObj = await admin.app().options.credential.getAccessToken();
            const token = tokenObj.access_token;

            const req = https.request(url + '.json', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 5000
            }, (res) => {
                if (res.statusCode === 200) {
                    resolve({ url, success: true, status: res.statusCode });
                } else {
                    resolve({ url, success: false, status: res.statusCode });
                }
            });

            req.on('error', (e) => {
                resolve({ url, success: false, error: e.message });
            });

            req.end();
        } catch (e) {
            console.error("Auth error:", e.message);
            resolve({ url, success: false, error: e.message });
        }
    });
}

// 5. Run
(async () => {
    console.log(`Checking URLs for project: ${projectId}...`);
    for (const url of candidates) {
        process.stdout.write(`Trying ${url} ... `);
        const result = await checkUrl(url);
        if (result.success) {
            console.log('SUCCESS!');
            console.log(`FOUND CORRECT URL: ${result.url}`);
            // Remove trailing slash for env var
            const cleanUrl = result.url.endsWith('/') ? result.url.slice(0, -1) : result.url;
            console.log(`CLEAN URL: ${cleanUrl}`);
            process.exit(0);
        } else {
            console.log(`Fail (${result.status || result.error})`);
        }
    }
    console.log('Could not find a valid database URL automatically.');
    process.exit(1);
})();

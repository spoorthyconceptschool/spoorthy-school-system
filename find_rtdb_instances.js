const admin = require('firebase-admin');
const fs = require('fs');

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

// 2. Initialize Admin SDK
admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
    }),
    // Initialize without DB URL first
});

async function listDatabases() {
    try {
        console.log(`Checking project: ${projectId}`);
        // We need an OAuth token with proper scopes to query the Management API
        const token = await admin.app().options.credential.getAccessToken();

        // We will try to fetch the list of databases from default location AND common other locations
        // Management API: https://firebasedatabase.googleapis.com/v1beta/projects/{project}/locations/{location}/instances

        // Default (us-central1)
        await checkLocation('us-central1', token.access_token);
        // Asia Southeast - Singapore (common for India region users)
        await checkLocation('asia-southeast1', token.access_token);
        // Europe West
        await checkLocation('europe-west1', token.access_token);

    } catch (error) {
        console.error("Error:", error);
    }
}

async function checkLocation(location, authToken) {
    const url = `https://firebasedatabase.googleapis.com/v1beta/projects/${projectId}/locations/${location}/instances`;
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.instances && data.instances.length > 0) {
                console.log(`FOUND INSTANCES in ${location}:`);
                data.instances.forEach(inst => {
                    console.log(`- Name: ${inst.name}`);
                    console.log(`- URL: ${inst.databaseUrl}`);
                    console.log(`- State: ${inst.state}`);
                });
                process.exit(0);
            } else {
                console.log(`No instances found in ${location}`);
            }
        } else {
            // 404 means no resources in this location usually
            console.log(`Location ${location}: ${response.status} ${response.statusText}`);
        }
    } catch (e) {
        console.log(`Failed to reach ${location}: ${e.message}`);
    }
}

listDatabases();

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
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

if (!privateKey || !clientEmail) {
    console.error("Missing credentials");
    process.exit(1);
}

// Initialize Admin SDK
admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
    })
});

const buckets = [
    'spoorthy-school.appspot.com',
    `${projectId}.appspot.com`,
    `${projectId}.firebasestorage.app`,
    projectId
];

async function testUpload() {
    console.log("Starting Upload Tests...");

    // Create a dummy file
    const filename = 'test_upload_verify.txt';
    fs.writeFileSync(filename, 'This is a test upload to verify bucket connectivity.');

    for (const bucketName of buckets) {
        process.stdout.write(`Testing bucket: ${bucketName} ... `);
        try {
            const bucket = admin.storage().bucket(bucketName);
            const destination = `verify_uploads/${Date.now()}_test.txt`;

            await bucket.upload(filename, {
                destination: destination,
                metadata: {
                    contentType: 'text/plain'
                }
            });

            console.log("SUCCESS");

            // Allow public read to verify URL generation
            const file = bucket.file(destination);
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
            console.log(`Public URL: ${publicUrl}`);

            // Clean up
            await file.delete();
            console.log("Cleaned up test file.");

            // Found it!
            console.log(`\nCORRECT_BUCKET=${bucketName}`);
            fs.unlinkSync(filename);
            process.exit(0);

        } catch (e) {
            console.log("FAILED");
            // console.log(e.message); // Uncomment for verbose error
        }
    }

    console.log("\nAll bucket attempts failed.");
    fs.unlinkSync(filename);
    process.exit(1);
}

testUpload();

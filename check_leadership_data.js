const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env vars
const env = dotenv.parse(fs.readFileSync('.env.local'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
}

const db = admin.database();
db.ref('siteContent/home/leadership').once('value')
    .then(snap => {
        console.log(JSON.stringify(snap.val(), null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

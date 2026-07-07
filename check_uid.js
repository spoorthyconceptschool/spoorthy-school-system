const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const privateKey = process.env.SERVICE_ACCOUNT_PRIVATE_KEY
    ? process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
    : "";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "spoorthy-16292",
            clientEmail: "firebase-adminsdk-fbsvc@spoorthy-16292.iam.gserviceaccount.com",
            privateKey: privateKey
        }),
        databaseURL: "https://spoorthy-16292-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkUser(email) {
    try {
        const userRecord = await auth.getUserByEmail(email);
        console.log("Auth User Record:", userRecord.email, userRecord.uid);
        console.log("Custom Claims:", userRecord.customClaims);

        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        if (userDoc.exists) {
            console.log("User Firestore Data:", userDoc.data());
        } else {
            console.log("User not found in 'users' collection.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

const email = process.argv[2] || 'prannu@gmail.com';
checkUser(email);

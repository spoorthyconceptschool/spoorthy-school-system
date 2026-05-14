import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SERVICE_ACCOUNT = {
    projectId: "spoorthy-high-school-new",
    clientEmail: "firebase-adminsdk-fbsvc@spoorthy-high-school-new.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : ""
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT),
    projectId: "spoorthy-16292",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  });
}

const db = admin.firestore();

async function initAdmin() {
  const email = 'nakkalapavani08@gmail.com';
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('Found user UID:', user.uid);
    
    // Set Custom Claims
    await admin.auth().setCustomUserClaims(user.uid, { role: 'SUPER_ADMIN' });
    console.log('Set custom claims successfully');

    // Create Firestore Document
    await db.collection('users').doc(user.uid).set({
      email: email,
      role: 'SUPER_ADMIN',
      name: 'Spoorthy Admin',
      schoolId: 'global',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log('Created Firestore user document successfully');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

initAdmin();

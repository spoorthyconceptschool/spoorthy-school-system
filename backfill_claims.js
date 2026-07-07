const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

admin.initializeApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

async function run() {
  const db = getFirestore();
  const auth = getAuth();
  
  const usersSnap = await db.collection('users').get();
  let count = 0;
  
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.role) {
      try {
        const claims = {
            role: data.role,
            schoolId: data.schoolId || null,
            branchId: data.branchId || null
        };
        await auth.setCustomUserClaims(doc.id, claims);
        console.log(`Set claims for ${doc.id}: ${data.role}`);
        count++;
      } catch (err) {
        console.error(`Failed for ${doc.id}:`, err.message);
      }
    }
  }
  console.log(`Successfully updated ${count} users.`);
  process.exit(0);
}

run();

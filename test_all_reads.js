const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkAccess(name, p) {
    try {
        await p;
        console.log(`[SUCCESS] ${name}`);
    } catch (e) {
        console.log(`[FAIL] ${name} - ${e.code}`);
    }
}

async function run() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, 'bunny@gmail.com', '9963256396');
    console.log('Logged in as:', userCredential.user.uid);
    
    await checkAccess('users/own', getDoc(doc(db, 'users', userCredential.user.uid)));
    await checkAccess('branches/own', getDoc(doc(db, 'branches', 'H9j8aIJcS71lLTAAL3pn')));
    await checkAccess('config/academic_years', getDoc(doc(db, 'config', 'academic_years')));
    await checkAccess('config/system', getDoc(doc(db, 'config', 'system')));
    await checkAccess('website_settings/main', getDoc(doc(db, 'website_settings', 'main')));
    await checkAccess('classes/query', getDocs(query(collection(db, 'classes'), where('schoolId', '==', 'H9j8aIJcS71lLTAAL3pn'))));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
run();

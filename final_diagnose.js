const admin = require('firebase-admin');
const serviceAccount = require('./src/lib/service-account.json');

if (!admin.apps.length) {
    let key = serviceAccount.private_key;
    console.log("Raw key start:", key.substring(0, 50));
    const privateKey = key.replace(/\\n/g, '\n');
    console.log("Cleaned key start:", privateKey.substring(0, 50));
    
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: serviceAccount.project_id || "spoorthy-school-live-55917",
            clientEmail: serviceAccount.client_email,
            privateKey: privateKey
        }),
        databaseURL: "https://spoorthy-school-live-55917-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();
const rtdb = admin.database();

async function runDiagnosis() {
    console.log("=== STARTING FINAL DIAGNOSIS ===");

    // 1. Fetch Class Names for context
    const classesSnap = await rtdb.ref('master/classes').once('value');
    const classes = classesSnap.val() || {};
    const classNameMap = {};
    Object.values(classes).forEach(c => { classNameMap[c.id] = c.name; });

    // 2. Fetch Section Names for context
    const sectionsSnap = await rtdb.ref('master/sections').once('value');
    const sections = sectionsSnap.val() || {};
    const sectionNameMap = {};
    Object.values(sections).forEach(s => { sectionNameMap[s.id] = s.name; });

    // 3. Inspect RTDB master/classSections keys
    console.log("\n--- RTDB master/classSections Keys ---");
    const csSnap = await rtdb.ref('master/classSections').once('value');
    const csData = csSnap.val() || {};
    const csKeys = Object.keys(csData);
    
    csKeys.forEach(key => {
        const item = csData[key];
        const className = classNameMap[item.classId] || 'Unknown';
        const sectionName = sectionNameMap[item.sectionId] || 'Unknown';
        console.log(`Key: "${key}" -> ${className} Section ${sectionName} (Status: ${item.active ? 'Active' : 'Inactive'})`);
    });

    // 4. Inspect Firestore class_timetables IDs
    console.log("\n--- Firestore class_timetables IDs ---");
    const ttSnap = await db.collection('class_timetables').get();
    if (ttSnap.empty) {
        console.log("No documents found in class_timetables.");
    } else {
        ttSnap.forEach(doc => {
            console.log(`ID: "${doc.id}" (Status: ${doc.data().status})`);
        });
    }

    // 5. Check if a specific test ID would match
    const testYear = "2026-2027";
    console.log(`\n--- Test Matching for Year: ${testYear} ---`);
    csKeys.forEach(key => {
        const expectedId = `${testYear}_${key}`;
        const match = ttSnap.docs.find(d => d.id === expectedId);
        const legacyId = `${testYear}_class_${key}`;
        const legacyMatch = ttSnap.docs.find(d => d.id === legacyId);
        
        console.log(`RTDB Key "${key}":`);
        console.log(`  Expected ID: "${expectedId}" -> ${match ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
        console.log(`  Legacy ID:   "${legacyId}" -> ${legacyMatch ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
    });

    process.exit(0);
}

runDiagnosis().catch(e => {
    console.error("DIAGNOSIS FAILED:", e);
    process.exit(1);
});

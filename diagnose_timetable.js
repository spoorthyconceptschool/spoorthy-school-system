const admin = require('firebase-admin');
const serviceAccount = require('./src/lib/service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://spoorthy-school-live-55917-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();
const rtdb = admin.database();

async function diagnose() {
    console.log("--- DIAGNOSTIC START ---");

    // 1. Check all published timetables IDs
    console.log("\nListing all class_timetables documents:");
    const ttSnap = await db.collection('class_timetables').get();
    if (ttSnap.empty) {
        console.log("No timetables found inFirestore!");
    } else {
        ttSnap.forEach(doc => {
            console.log(`- ${doc.id} (Status: ${doc.data().status})`);
        });
    }

    // 2. Sample check for teacher ID consistency
    if (!ttSnap.empty) {
        const doc = ttSnap.docs[0];
        console.log(`\nAnalyzing sample timetable: ${doc.id}`);
        const schedule = doc.data().schedule || {};
        for (const day in schedule) {
            for (const slotId in schedule[day]) {
                const cell = schedule[day][slotId];
                if (cell.teacherId && cell.teacherId !== "leisure" && cell.teacherId !== "UNASSIGNED") {
                    console.log(`Found teacherId in schedule: "${cell.teacherId}"`);
                    const tDoc = await db.collection('teachers').doc(cell.teacherId).get();
                    if (tDoc.exists) {
                        console.log(`- Matches Firestore Doc ID! Name: ${tDoc.data().name}`);
                    } else {
                        const tSnap2 = await db.collection('teachers').where('schoolId', '==', cell.teacherId).get();
                        if (!tSnap2.empty) {
                            console.log(`- Matches Teacher schoolId! Name: ${tSnap2.docs[0].data().name}`);
                        } else {
                            console.log(`- DOES NOT MATCH ANY TEACHER!`);
                        }
                    }
                    // Stop after first non-empty teacher
                    break;
                }
            }
            if (schedule[day]) break; 
        }
    }

    // 3. Check RTDB
    console.log("\nChecking RTDB master/classSections keys:");
    const csRef = rtdb.ref('master/classSections');
    const csSnap = await csRef.once('value');
    if (csSnap.exists()) {
        const keys = Object.keys(csSnap.val());
        console.log("Sample classSections keys (first 5):", keys.slice(0, 5));
    } else {
        console.log("master/classSections not found in RTDB!");
    }

    process.exit(0);
}

diagnose().catch(console.error);

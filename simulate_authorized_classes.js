require('dotenv').config({ path: './.env.local' });
const admin = require('firebase-admin');

const projectId = "spoorthy-16292";
const clientEmail = "firebase-adminsdk-fbsvc@spoorthy-16292.iam.gserviceaccount.com";
const rawKey = process.env.SERVICE_ACCOUNT_PRIVATE_KEY;

if (!rawKey) {
    console.error("SERVICE_ACCOUNT_PRIVATE_KEY not found!");
    process.exit(1);
}

const privateKey = rawKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        }),
        databaseURL: "https://spoorthy-16292-default-rtdb.firebaseio.com"
    });
}

const rtdb = admin.database();

async function run() {
    console.log("=== Simulating getAuthorizedClasses ===");
    
    // Fetch from RTDB
    const [csSnap, stSnap] = await Promise.all([
        rtdb.ref("master/classSections").once("value"),
        rtdb.ref("master/subjectTeachers").once("value")
    ]);

    const classSections = csSnap.val() || {};
    const subjectTeachers = stSnap.val() || {};

    const tProfile = {
        id: "TCH100", // simulated profile document id
        schoolId: "TCH100" // simulated profile schoolId
    };

    const tId = tProfile.schoolId;
    const tDocId = tProfile.id;

    const set = new Map();

    // 1. Classes where I am Class Teacher (Dynamic from RTDB)
    Object.values(classSections).forEach((cs) => {
        const isMatch = (tId && cs.classTeacherId === tId) || (tDocId && cs.classTeacherId === tDocId);
        if (isMatch && cs.isActive !== false) {
            set.set(cs.id, { classId: cs.classId, sectionId: cs.sectionId, key: cs.id, isClassTeacher: true });
        }
    });

    console.log("After Class Teacher check:", Array.from(set.values()));

    // 2. Classes where I am Subject Teacher (Dynamic from RTDB)
    if (subjectTeachers) {
        Object.keys(subjectTeachers).forEach(key => {
            const subjectsObj = subjectTeachers[key];
            const teacherIds = Object.values(subjectsObj);
            const isMatch = (tId && teacherIds.includes(tId)) || (tDocId && teacherIds.includes(tDocId));

            if (isMatch) {
                const cs = classSections[key];
                const cId = cs?.classId || key.split('_')[0];
                const sId = cs?.sectionId || key.split('_')[1];

                if (!set.has(key)) {
                    set.set(key, { classId: cId, sectionId: sId, key, isClassTeacher: false });
                }
            }
        });
    }

    console.log("After Subject Teacher check (Full Set):", Array.from(set.values()));
}

run().catch(console.error);

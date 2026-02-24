const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
    admin.initializeApp({
        databaseURL: "https://spoorthy-school-live-55917-default-rtdb.firebaseio.com"
    });
}

const db = admin.database();

async function getDefaults() {
    const brandingSnap = await db.ref('master/branding').once('value');
    const heroSnap = await db.ref('siteContent/home/hero').once('value');

    console.log("BRANDING:", JSON.stringify(brandingSnap.val(), null, 2));
    console.log("HERO:", JSON.stringify(heroSnap.val(), null, 2));
    process.exit(0);
}

getDefaults();

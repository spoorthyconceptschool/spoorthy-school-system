import { rtdb } from "./src/lib/firebase.js";
import { ref, get } from "firebase/database";

async function checkData() {
    try {
        const brandingSnap = await get(ref(rtdb, 'siteContent/branding'));
        const masterBrandingSnap = await get(ref(rtdb, 'master/branding'));
        const heroSnap = await get(ref(rtdb, 'siteContent/home/hero'));

        console.log("--- siteContent/branding ---");
        console.log(brandingSnap.val());
        console.log("\n--- master/branding ---");
        console.log(masterBrandingSnap.val());
        console.log("\n--- siteContent/home/hero ---");
        console.log(heroSnap.val());

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkData();

import { seedDemoData } from "../src/lib/demo-data";

async function run() {
    const branches = ["W4ZEOJXUpmccvyffIaIo", "R63uU7cnSsLtDs6B1UeV"];
    for (const branchId of branches) {
        console.log(`[Script] Seeding data for branch: ${branchId}`);
        await seedDemoData(branchId);
    }
    console.log("[Script] Seeding complete successfully!");
}

run().then(() => process.exit(0)).catch(err => {
    console.error("Seeding Failed:", err);
    process.exit(1);
});

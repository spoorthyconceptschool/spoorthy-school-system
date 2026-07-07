import { seedDemoData } from "../src/lib/demo-data";

async function runSeed() {
    console.log("Seeding for vcQw0kUZsylrL3GtDdEp...");
    await seedDemoData("vcQw0kUZsylrL3GtDdEp");

    console.log("Seeding for H9j8aIJcS71lLTAAL3pn...");
    await seedDemoData("H9j8aIJcS71lLTAAL3pn");
    
    console.log("Done.");
}

runSeed().then(() => process.exit(0));

async function run() {
    try {
        console.log("Testing eval require...");
        const req = eval("require");
        const admin = req('firebase-admin');
        console.log("Success! Admin keys:", Object.keys(admin).slice(0, 5));
    } catch (e: any) {
        console.error("Error:", e.message || String(e));
    }
}
run();

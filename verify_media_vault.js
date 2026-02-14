
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// --- CONFIGURATION ---
// 1. Get your API Key from your Mocha Dashboard or Settings
// 2. Paste it below to test
const MEDIA_VAULT_API_KEY = process.env.MEDIA_VAULT_API_KEY || "PASTE_YOUR_KEY_HERE";
const URL = "https://fn7hnjxmkfxii.mocha.app/api/media/upload";

async function verifyMediaVault() {
    console.log("--- MediaVault Connection Test ---");
    console.log("Target:", URL);
    console.log("Key:", MEDIA_VAULT_API_KEY === "PASTE_YOUR_KEY_HERE" ? "(Missing)" : MEDIA_VAULT_API_KEY.substring(0, 5) + "...");

    if (MEDIA_VAULT_API_KEY === "PASTE_YOUR_KEY_HERE") {
        console.error("\n[!] Please set MEDIA_VAULT_API_KEY environment variable or edit this script.");
        return;
    }

    const filePath = path.join(__dirname, 'test_upload.txt');
    fs.writeFileSync(filePath, "Test connection " + Date.now());

    try {
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: 'text/plain' });
        formData.append("file", blob, "connection_test.txt");

        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "x-api-key": MEDIA_VAULT_API_KEY
            },
            body: formData
        });

        console.log("\nStatus:", response.status);
        const text = await response.text();

        if (response.ok) {
            console.log("✅ SUCCESS!");
            console.log("Response:", text);
        } else {
            console.error("❌ FAILED");
            console.error("Error:", text);
        }

    } catch (e) {
        console.error("Network Error:", e);
    } finally {
        try { fs.unlinkSync(filePath); } catch (e) { }
    }
}

verifyMediaVault();

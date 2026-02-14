
const fs = require('fs');
const path = require('path');

async function testUpload() {
    const url = "https://fn7hnjxmkfxii.mocha.app/api/media/upload";
    const filePath = path.join(__dirname, 'test_upload.txt');

    // Create a dummy file
    fs.writeFileSync(filePath, "Hello Mocha World " + Date.now());

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });

    formData.append("file", blob, "test_file.txt");

    console.log("Uploading to:", url);

    const appId = "019c4eea-e848-752b-b9aa-0b61f3ac5761";
    const headersList = [
        { "x-api-key": appId },
        { "Authorization": `Bearer ${appId}` },
        { "x-app-id": appId },
        { "Authorization": appId }
    ];

    for (const headers of headersList) {
        console.log("Trying headers:", JSON.stringify(headers));
        try {
            // Re-append file for each request because streams are consumed
            const subFormData = new FormData();
            subFormData.append("file", new Blob([fs.readFileSync(filePath)], { type: 'text/plain' }), "test_file.txt");

            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: subFormData
            });

            console.log("Status:", response.status);
            const text = await response.text();
            console.log("Response:", text);

            if (response.ok) {
                console.log("SUCCESS with headers:", JSON.stringify(headers));
                return;
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Cleanup
    try { fs.unlinkSync(filePath); } catch (e) { }
}

testUpload();

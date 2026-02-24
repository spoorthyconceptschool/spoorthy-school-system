const https = require('https');

const url = "https://firebasestorage.googleapis.com/v0/b/spoorthy-school-live-55917.firebasestorage.app/o/demo%2Flogo.png?alt=media";

const req = https.request(url, { method: 'HEAD' }, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    process.exit(0);
});

req.on('error', (e) => {
    console.error(e);
    process.exit(1);
});

req.end();

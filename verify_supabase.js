const https = require('https');

const url = "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png";

const req = https.request(url, { method: 'HEAD' }, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    process.exit(0);
});

req.on('error', (e) => {
    console.error(e);
    process.exit(1);
});

req.end();

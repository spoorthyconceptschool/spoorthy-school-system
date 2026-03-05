const fs = require('fs');
const https = require('https');
https.get('https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/311163a2-95a5-4ca8-a7ae-a632f7e062c8.png', res => {
    res.pipe(fs.createWriteStream('testlogo.png'));
});

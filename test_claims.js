const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./output.json', 'utf8'));
// output.json is NOT a service account credential! Ah, the previous command failed because output.json is not the credential.

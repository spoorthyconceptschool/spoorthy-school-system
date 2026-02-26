const admin = require('firebase-admin');

const SERVICE_ACCOUNT = {
    projectId: "spoorthy-school-live-55917",
    clientEmail: "firebase-adminsdk-fbsvc@spoorthy-school-live-55917.iam.gserviceaccount.com",
    privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBD9jOWURxOWWe\nusluSwppP+rc3hzT0mUpeo/XA/dhFB1TOsmPNwHoL8qmgaFxAQJqdFDQsSpv3qua\neRr3AkrTC3zXLA4JgnClHVNh1pzRchAf1XgSNfH98P+bGDn9LZuoWLQMYDp5tBgb\n1QyO7LNrBxAxXe24X3xu2i6KJLHCA9ofS1oTy7AVHuoXflJI2DU4FazD2HAIV4/z\nGbb89ChZTyTSaoybJUEcJYJNY+BlFQjstGxRAdHINEoZvcwWEB34PUM1wZvP/p89\nCl6Qe2bYG/voeo2d6GmvCksUlPB5WUf+N6HWelxop+jZwnRahI5UenTjaxZZsWO8\nB/xbIDtzAgMBAAECggEAJkVdbZ5dhnJh1iLh7la61B1jEfCH12e0PRI6NF3papmh\nrI+RSC4X1y6uJe65kZypHXA8Wvpb1rxV2TPbqA6QxaBX2ZG2oKT2bozPLCxufsh1\nMNJQ0I9YDsZ47QZS7IDfg/I9ktx6iwir5MyJhkWe1X8bcyXTC4MGODVRF3ppsHNZ\nqNOoLIOsMaQ8PuvlndR6AdXIYv6mG3UNLVoTNBBqdQ2E7YA8+29gHjt3+AWGQyhq\nLD1v2k/y6hRQbCD/sgxM9wK7w9Y1bmvuEIk2wNNl2kZIlrPgvK94K444XEbe0vVl\n+1hBicUrg5eHDCcx5H3WUDKFTWteFRhwJvH0LeGZZQKBgQDvD0fS511VGbZr/9Qa\n8n59/4kTVzoqdERj4XawCOng8IxfWdHUw7X/Jkmtz5GQ+ppDKiMmS12gIBQ1czPY\nH/pAtiTP+aQd2SVsD0wdu8k7CfUiKUQarufemZNMAIrd4xYZKknk8ev0B45pzczz\nik6G8mtA44/qD6F55cWSPNX8NQKBgQDOviHp1YY75pnTo7JxPI31FsxhcjvIgenW\nfbwKtFIxT3rCVmolLqcPzHdb8fbMc56KbztoBLgaAoxFoQDWfcF3eYg7dTirii/Y\nCvfG3+e++t648CQu9ZRf3q/CRKM9M+tWniD5QlbLSMrcJnKmYzADQ5QncEVaua6L\nkdI6/Ju+BwKBgCVB9mmyUWN//GRcnMwOWxR8DPsMry4KrNX8P6kz2m+KTfZWY1OL\npQO9DeKe5Qr5Y61wFcZUHKVmGoAyEjRu12vad2ZKe/+C5kgvIifIKpae+Kt4Tvrx\no4WX3dMMipgGWl1Vr+qUobeIrfNjdbvHJHH3uiuEy9so0HvVCbO+84K5AoGBALfb\nKnmzJB8dImuuRkCho3T0g2mdl0DnF7diNdonJnknv3oYM2lBpdxM71DbS6nioHlo\nFiKZH8gxv+EkH4SgbW78q4SE6JLU31t31YYNFSEoJO2+0c7ZIsxnU1Kmi60gAQgU\ntCo3Lsy1vYIuxwLlbotYi+bO1z6ppmoEkjtW7oH9AoGBALatJL2vAyglLAEeWE1g\nl4ycx9f9pQjcBJkI42QN1mJHDEzwvFEYLOA+IQ6Etpq9Mr/ClZbk6Yx7MnMcOfmO\nBaPSSR5gR5U7dpizKbEbhLsLIb7qu8BdrMUKZvrx0Nn6Rlu8oFoM6ka9gDYRTKEz\nmKQAwq0Q0dPAv5PdJCkooKsh\n-----END PRIVATE KEY-----`
};

admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT),
});

async function run() {
    const start = Date.now();
    const bucketNames = [
        "spoorthy-school-live-55917.firebasestorage.app", // standard correct bucket name
        "spoorthy-school-live-55917.appspot.com",
    ];
    for (const bName of bucketNames) {
        console.log("Trying bucket:", bName);
        try {
            const bucket = admin.storage().bucket(bName);
            const blob = bucket.file(`settings/branding/test_${start}.txt`);
            console.log("Saving file to bucket...");
            await blob.save(Buffer.from("HelloWorld"), {
                contentType: "text/plain",
                public: true,
                metadata: {
                    firebaseStorageDownloadTokens: Date.now().toString(),
                }
            });
            console.log("Saved successfully to", bName);
            return;
        } catch (e) {
            console.error("Failed to upload to:", bName, e.message);
        }
    }
}
run();

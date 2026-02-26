// import "server-only";
import * as admin from "firebase-admin";

/**
 * ENGINE V5: COMPATIBILITY LAYER
 * Optimized for Next.js 15 + Firebase Hosting Frameworks.
 * Uses strict singleton pattern to prevent 'App already exists' and 'App missing' errors.
 */

const SERVICE_ACCOUNT = {
    projectId: "spoorthy-school-live-55917",
    clientEmail: "firebase-adminsdk-fbsvc@spoorthy-school-live-55917.iam.gserviceaccount.com",
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBD9jOWURxOWWe
usluSwppP+rc3hzT0mUpeo/XA/dhFB1TOsmPNwHoL8qmgaFxAQJqdFDQsSpv3qua
eRr3AkrTC3zXLA4JgnClHVNh1pzRchAf1XgSNfH98P+bGDn9LZuoWLQMYDp5tBgb
1QyO7LNrBxAxXe24X3xu2i6KJLHCA9ofS1oTy7AVHuoXflJI2DU4FazD2HAIV4/z
Gbb89ChZTyTSaoybJUEcJYJNY+BlFQjstGxRAdHINEoZvcwWEB34PUM1wZvP/p89
Cl6Qe2bYG/voeo2d6GmvCksUlPB5WUf+N6HWelxop+jZwnRahI5UenTjaxZZsWO8
B/xbIDtzAgMBAAECggEAJkVdbZ5dhnJh1iLh7la61B1jEfCH12e0PRI6NF3papmh
rI+RSC4X1y6uJe65kZypHXA8Wvpb1rxV2TPbqA6QxaBX2ZG2oKT2bozPLCxufsh1
MNJQ0I9YDsZ47QZS7IDfg/I9ktx6iwir5MyJhkWe1X8bcyXTC4MGODVRF3ppsHNZ
qNOoLIOsMaQ8PuvlndR6AdXIYv6mG3UNLVoTNBBqdQ2E7YA8+29gHjt3+AWGQyhq
LD1v2k/y6hRQbCD/sgxM9wK7w9Y1bmvuEIk2wNNl2kZIlrPgvK94K444XEbe0vVl
+1hBicUrg5eHDCcx5H3WUDKFTWteFRhwJvH0LeGZZQKBgQDvD0fS511VGbZr/9Qa
8n59/4kTVzoqdERj4XawCOng8IxfWdHUw7X/Jkmtz5GQ+ppDKiMmS12gIBQ1czPY
H/pAtiTP+aQd2SVsD0wdu8k7CfUiKUQarufemZNMAIrd4xYZKknk8ev0B45pzczz
ik6G8mtA44/qD6F55cWSPNX8NQKBgQDOviHp1YY75pnTo7JxPI31FsxhcjvIgenW
fbwKtFIxT3rCVmolLqcPzHdb8fbMc56KbztoBLgaAoxFoQDWfcF3eYg7dTirii/Y
CvfG3+e++t648CQu9ZRf3q/CRKM9M+tWniD5QlbLSMrcJnKmYzADQ5QncEVaua6L
kdI6/Ju+BwKBgCVB9mmyUWN//GRcnMwOWxR8DPsMry4KrNX8P6kz2m+KTfZWY1OL
pQO9DeKe5Qr5Y61wFcZUHKVmGoAyEjRu12vad2ZKe/+C5kgvIifIKpae+Kt4Tvrx
o4WX3dMMipgGWl1Vr+qUobeIrfNjdbvHJHH3uiuEy9so0HvVCbO+84K5AoGBALfb
KnmzJB8dImuuRkCho3T0g2mdl0DnF7diNdonJnknv3oYM2lBpdxM71DbS6nioHlo
FiKZH8gxv+EkH4SgbW78q4SE6JLU31t31YYNFSEoJO2+0c7ZIsxnU1Kmi60gAQgU
tCo3Lsy1vYIuxwLlbotYi+bO1z6ppmoEkjtW7oH9AoGBALatJL2vAyglLAEeWE1g
l4ycx9f9pQjcBJkI42QN1mJHDEzwvFEYLOA+IQ6Etpq9Mr/ClZbk6Yx7MnMcOfmO
BaPSSR5gR5U7dpizKbEbhLsLIb7qu8BdrMUKZvrx0Nn6Rlu8oFoM6ka9gDYRTKEz
mKQAwq0Q0dPAv5PdJCkooKsh
-----END PRIVATE KEY-----`
};

let _app: admin.app.App | null = null;
let _initError: string | null = null;

function initAdmin() {
    if (_app) return _app;

    // Check if already initialized by another module
    if (admin.apps.length > 0) {
        _app = admin.apps[0];
        return _app;
    }

    try {
        console.log("[FIREBASE ADMIN] Attempting Initialization...");
        _app = admin.initializeApp({
            credential: admin.credential.cert(SERVICE_ACCOUNT),
            storageBucket: "spoorthy-school-live-55917.firebasestorage.app",
            databaseURL: "https://spoorthy-school-live-55917-default-rtdb.firebaseio.com"
        });
        console.log("[FIREBASE ADMIN] Success.");
        return _app;
    } catch (e: any) {
        console.error("[FIREBASE ADMIN] Initialization Failed:", e);
        _initError = e.message || String(e);
        // Do not throw here to prevent top-level crashes.
        // Handlers using the services will throw when they access the Proxy.
        return null as any;
    }
}

// Fixed services with lazy-load Proxy pattern
const createLazyService = (serviceName: 'firestore' | 'auth' | 'storage' | 'database' | 'messaging') => {
    return new Proxy({} as any, {
        get(target, prop) {
            const app = initAdmin();
            if (!app) {
                throw new Error(`Firebase Admin failed to initialize: ${_initError || 'Unknown Error'}`);
            }
            const service = (app as any)[serviceName]();
            const value = service[prop];
            return typeof value === 'function' ? value.bind(service) : value;
        }
    });
};

export const adminDb = createLazyService('firestore');
export const adminAuth = createLazyService('auth');
export const adminStorage = createLazyService('storage');
export const adminRtdb = createLazyService('database');
export const adminMessaging = createLazyService('messaging');

// Also keep the getters for compatibility
export const getAdminDb = () => initAdmin()?.firestore();
export const getAdminAuth = () => initAdmin()?.auth();
export const getAdminStorage = () => initAdmin()?.storage();
export const getAdminRtdb = () => initAdmin()?.database();

export const getInitError = () => _initError;

// Static helpers to avoid sub-package import issues
// These are safe to access directly from the admin object
export const FieldValue = admin.firestore.FieldValue;
export const FieldPath = admin.firestore.FieldPath;
export const Timestamp = admin.firestore.Timestamp;
export const ServerValue = admin.database.ServerValue;

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue as FirestoreFieldValue, FieldPath as FirestoreFieldPath, Timestamp as FirestoreTimestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getDatabase, ServerValue as RTDBServerValue } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";

/**
 * ENGINE V5: MODULAR COMPATIBILITY LAYER
 * Optimized for Next.js 15 + Firebase Hosting Frameworks.
 * Uses modular imports to prevent bundling errors in production.
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

let _initError: string | null = null;

function initAdmin() {
    const apps = getApps();
    if (apps.length > 0) return apps[0];

    try {
        return initializeApp({
            credential: cert(SERVICE_ACCOUNT),
            storageBucket: "spoorthy-school-live-55917.firebasestorage.app",
            databaseURL: "https://spoorthy-school-live-55917-default-rtdb.firebaseio.com"
        });
    } catch (e: any) {
        console.error("[FIREBASE ADMIN] Initialization Failed:", e);
        _initError = e.message || String(e);
        return null as any;
    }
}

// Fixed services with lazy-load Proxy pattern
const createLazyService = (serviceName: string) => {
    return new Proxy({} as any, {
        get(target, prop) {
            const app = initAdmin();
            if (!app) {
                throw new Error(`Firebase Admin failed to initialize: ${_initError || 'Unknown Error'}`);
            }

            let service;
            switch (serviceName) {
                case 'firestore': service = getFirestore(app); break;
                case 'auth': service = getAuth(app); break;
                case 'database': service = getDatabase(app); break;
                case 'storage': service = getStorage(app); break;
                case 'messaging': service = getMessaging(app); break;
                default: throw new Error(`Unknown service: ${serviceName}`);
            }

            const value = (service as any)[prop];
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
export const getAdminDb = () => getFirestore(initAdmin());
export const getAdminAuth = () => getAuth(initAdmin());
export const getAdminStorage = () => getStorage(initAdmin());
export const getAdminRtdb = () => getDatabase(initAdmin());

export const getInitError = () => _initError;

// Static helpers using modular exports
export const FieldValue = FirestoreFieldValue;
export const FieldPath = FirestoreFieldPath;
export const Timestamp = FirestoreTimestamp;
export const ServerValue = RTDBServerValue;

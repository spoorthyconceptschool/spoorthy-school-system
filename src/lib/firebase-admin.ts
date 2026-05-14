/**
 * ENGINE V13: ULTIMATE BUNDLER BYPASS LAYER
 * Next.js Turbopack (App Router) destroys external packages in Firebase Functions by mangling
 * the module resolution. Standard static imports and standard `require` both crash on the live server.
 * This implementation uses `eval` to completely hide the `require` call from Next.js's static analyzer,
 * forcing it to use the raw Node.js module loader at runtime in the Firebase Functions container.
 */

// Dynamically fetch the native Node.js require
const getNativeRequire = () => {
    if (typeof window !== 'undefined') return null;
    try {
        // Obfuscate require to prevent Next/Webpack/Turbopack from replacing it with externalRequire
        const req = eval("require");
        return req;
    } catch {
        return null;
    }
};

let _cachedAdmin: any = null;

function getAdminRoot() {
    if (typeof window !== 'undefined') return null;
    if (_cachedAdmin) return _cachedAdmin;

    const req = getNativeRequire();
    if (!req) throw new Error("Native Node.js require is not available. Cannot load Firebase Admin.");

    _cachedAdmin = req("firebase-admin");
    return _cachedAdmin;
}

type App = any;

/**
 * ENGINE V6: ENTERPRISE STABILITY LAYER
 * Standardized for production deployments.
 */

const SERVICE_ACCOUNT = {
    projectId: "spoorthy-high-school-new",
    clientEmail: "firebase-adminsdk-fbsvc@spoorthy-high-school-new.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : ""
};

let _initError: string | null = null;

function getAdminApp(): App {
    const adminRoot = getAdminRoot();
    if (!adminRoot) throw new Error("Firebase Admin is not available on client-side");

    try {
        if (adminRoot.apps.length > 0) {
            adminRoot.apps.forEach(app => {
                if (app) adminRoot.app(app.name).delete();
            });
        }

        const privateKey = (process.env.FIREBASE_PRIVATE_KEY || SERVICE_ACCOUNT.privateKey).replace(/\\n/g, '\n');

        return adminRoot.initializeApp({
            credential: adminRoot.credential.cert({
                projectId: SERVICE_ACCOUNT.projectId,
                clientEmail: SERVICE_ACCOUNT.clientEmail,
                privateKey
            }),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Force it to target the new database!
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "spoorthy-16292.firebasestorage.app",
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://spoorthy-16292-default-rtdb.firebaseio.com"
        });
    } catch (e: any) {
        _initError = e.message || String(e);
        console.error("[CRITICAL] Firebase Admin Init Error:", e);
        throw e;
    }
}

// 1. Direct Service Exports (Functional Callers for Stability)
export const getAdminDb = () => getAdminRoot().firestore(getAdminApp());
export const getAdminAuth = () => getAdminRoot().auth(getAdminApp());
export const getAdminStorage = () => getAdminRoot().storage(getAdminApp());
export const getAdminRtdb = () => getAdminRoot().database(getAdminApp());
export const getAdminMessaging = () => getAdminRoot().messaging(getAdminApp());

// Lazy Loaders to prevent top-level module crash
const createLazyProxy = (getService: () => any) => {
    return new Proxy({} as any, {
        get(_, prop) {
            try {
                const service = getService();
                const value = service[prop];
                return typeof value === 'function' ? value.bind(service) : value;
            } catch (e: any) {
                console.error(`[Firebase Proxy] Error accessing property "${String(prop)}": `, e);
                throw e;
            }
        }
    });
};

/**
 * COMPATIBILITY LAYER - ROBUST LAZY PROXIES
 */
export const adminDb: any = createLazyProxy(() => getAdminDb());
export const adminAuth: any = createLazyProxy(() => getAdminAuth());
export const adminStorage: any = createLazyProxy(() => getAdminStorage());
export const adminRtdb: any = createLazyProxy(() => getAdminRtdb());
export const adminMessaging: any = createLazyProxy(() => getAdminMessaging());

export const getInitError = () => _initError;

// 2. Class/Constant Exports - lazy wrapped to prevent top-level require
export const FieldValue = createLazyProxy(() => getAdminRoot().firestore.FieldValue);
export const FieldPath = createLazyProxy(() => getAdminRoot().firestore.FieldPath);
export const Timestamp = createLazyProxy(() => getAdminRoot().firestore.Timestamp);
export const ServerValue = createLazyProxy(() => getAdminRoot().database.ServerValue);

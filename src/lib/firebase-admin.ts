import * as admin from "firebase-admin";

type App = admin.app.App;

/**
 * ENGINE V14: NATIVE BUNDLER COMPATIBILITY
 * Replaced dynamic require with standard static import to support Turbopack/Vercel environments.
 */
function getAdminRoot() {
    return admin;
}

/**
 * ENGINE V6: ENTERPRISE STABILITY LAYER
 * Standardized for production deployments.
 */

const SERVICE_ACCOUNT = {
    projectId: "spoorthy-16292",
    clientEmail: "firebase-adminsdk-fbsvc@spoorthy-16292.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : ""
};

let _adminApp: any = null;
let _initError: string | null = null;

function getAdminApp(): App {
    if (typeof window !== "undefined") throw new Error("Firebase Admin is not available on client-side");
    
    const adminRoot = getAdminRoot();
    if (_adminApp) return _adminApp;

    // Check if an app is already initialized with this name (usually [DEFAULT])
    if (adminRoot.apps.length > 0) {
        _adminApp = adminRoot.app();
        return _adminApp;
    }

    try {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || SERVICE_ACCOUNT.privateKey;
        const privateKey = rawKey?.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

        const config: any = {
            projectId: SERVICE_ACCOUNT.projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "spoorthy-16292.firebasestorage.app",
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://spoorthy-16292-default-rtdb.firebaseio.com"
        };

        if (privateKey && privateKey.includes("BEGIN PRIVATE KEY")) {
            config.credential = adminRoot.credential.cert({
                projectId: SERVICE_ACCOUNT.projectId,
                clientEmail: SERVICE_ACCOUNT.clientEmail,
                privateKey
            });
        }

        _adminApp = adminRoot.initializeApp(config);
        return _adminApp;
    } catch (e: any) {
        _initError = e.message || String(e);
        const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
        
        if (isBuildPhase) {
            console.warn(`[Firebase Admin] Using Build-Time Mock App due to: ${e.message}`);
            // Return a dummy app that returns dummy services during static generation
            const mockApp = {
                firestore: () => ({ 
                    collection: () => ({ 
                        where: () => ({ limit: () => ({ get: () => Promise.resolve({ docs: [], size: 0 }) }) }),
                        doc: () => ({ get: () => Promise.resolve({ exists: () => false }) }),
                        get: () => Promise.resolve({ docs: [], size: 0 })
                    }),
                    settings: () => {}
                }),
                auth: () => ({}),
                storage: () => ({ bucket: () => ({ file: () => ({ exists: () => [false] }) }) }),
                database: () => ({ 
                    ref: () => ({ 
                        get: () => Promise.resolve({ exists: () => false, val: () => null }),
                        on: () => {},
                        once: () => Promise.resolve({ exists: () => false, val: () => null })
                    }) 
                }),
                messaging: () => ({})
            } as any;
            _adminApp = mockApp;
            return _adminApp;
        }
        
        console.error("[CRITICAL] Firebase Admin Init Error:", e);
        throw e;
    }
}

// 1. Direct Service Exports (Functional Callers for Stability)
export const getAdminDb = () => getAdminApp().firestore();
export const getAdminAuth = () => getAdminApp().auth();
export const getAdminStorage = () => getAdminApp().storage();
export const getAdminRtdb = () => getAdminApp().database();
export const getAdminMessaging = () => getAdminApp().messaging();

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

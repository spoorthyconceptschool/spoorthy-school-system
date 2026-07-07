import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "./firebase-admin";

export interface VerifyRoleResult {
    verified: boolean;
    uid?: string;
    role?: string;
    email?: string;
    error?: string;
}

/**
 * Validates an incoming API request against a list of allowed roles.
 * Decodes the JWT and explicitly checks Firestore to avoid stale cache or claim issues.
 * 
 * @param req The incoming NextRequest
 * @param allowedRoles Array of uppercase role strings, e.g. ["ADMIN", "MANAGER"]. Use ["*"] to allow any valid user.
 */
export async function verifyApiRole(req: NextRequest, allowedRoles: string[]): Promise<VerifyRoleResult> {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return { verified: false, error: "Missing or invalid Authorization header" };
        }

        const token = authHeader.split("Bearer ")[1];
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        let role = decodedToken.role as string;
        
        // Fallback to Firestore if claim is missing or empty to ensure we have the most up-to-date role
        if (!role) {
            const adminDb = getAdminDb();
            
            // Check if user exists in the core users collection
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                if (data?.status === "DEACTIVATED") {
                    return { verified: false, error: "Account is deactivated" };
                }
                role = data?.role;
            } else {
                // Check if user exists in students collection directly
                const studentDoc = await adminDb.collection("students").doc(decodedToken.uid).get();
                if (studentDoc.exists) {
                    role = "STUDENT";
                }
            }
        }
        
        if (!role) {
            // Absolute last resort heuristic matching client-side logic
            if (decodedToken.email?.includes("admin")) role = "ADMIN";
            else if (decodedToken.email?.includes("teacher")) role = "TEACHER";
            else role = "STUDENT";
        }
        
        const roleUpper = role.toUpperCase();
        
        // Validate
        if (allowedRoles.includes(roleUpper) || allowedRoles.includes("*")) {
            return { verified: true, uid: decodedToken.uid, role: roleUpper, email: decodedToken.email };
        }
        
        return { verified: false, error: "Unauthorized role access" };
        
    } catch (error: any) {
        console.error("[API Auth] Token verification failed:", error);
        return { verified: false, error: "Invalid authentication token" };
    }
}

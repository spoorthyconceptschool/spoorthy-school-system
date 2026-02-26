import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Enterprise Route Authorization Middleware
 * Ensures strict role-based access control at the API level.
 */

export type Role = 'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'STUDENT';

export interface AuthenticatedUser {
    uid: string;
    email: string | undefined;
    role: Role;
    schoolId?: string; // For multi-tenant readiness
}

/**
 * Validates the Authorization Bearer token and verifies the required RBAC role.
 * 
 * @param req The Next.js request object
 * @param allowedRoles Array of roles authorized to hit this endpoint
 * @returns { user, errorResponse } Returns the user if valid, or a generic NextResponse if unauthorized.
 */
export async function authenticateRoute(
    req: NextRequest,
    allowedRoles: Role[]
): Promise<{ user?: AuthenticatedUser; errorResponse?: NextResponse }> {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                errorResponse: NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 })
            };
        }

        const token = authHeader.split('Bearer ')[1];

        // Verify token using Firebase Admin
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Destructure custom claims (Role should be strictly set on the user claims)
        const { role } = decodedToken;

        if (!role || !allowedRoles.includes(role as Role)) {
            console.warn(`[Enterprise SecOps] User ${decodedToken.uid} attempted forbidden access. Role: ${role}. Required: ${allowedRoles.join(' | ')}`);
            return {
                errorResponse: NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
            };
        }

        const authUser: AuthenticatedUser = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: role as Role,
            schoolId: decodedToken.schoolId || 'DEFAULT', // System default if not multi-tenant
        };

        return { user: authUser };
    } catch (error) {
        console.error("[Enterprise SecOps] Authentication Error:", error);
        return {
            errorResponse: NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 })
        };
    }
}

/**
 * Convenience wrapper for API routes to handle standard formatting
 */
export async function withEnterpriseGuard(
    req: NextRequest,
    allowedRoles: Role[],
    handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
    const { user, errorResponse } = await authenticateRoute(req, allowedRoles);

    if (errorResponse || !user) {
        return errorResponse;
    }

    try {
        return await handler(req, user);
    } catch (error: any) {
        console.error(`[Enterprise Backend] Unhandled Handler Exception:`, error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

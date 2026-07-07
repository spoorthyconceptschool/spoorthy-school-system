import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../firebase-admin';

// Helper to fetch Firestore user info if missing from claims
async function resolveUserInfo(decodedToken: any) {
  const info = {
    role: decodedToken.role,
    schoolId: decodedToken.schoolId,
    branchId: decodedToken.branchId,
  };

  // If role, schoolId, or branchId is missing, fetch from Firestore
  if (!info.role || !info.schoolId || !info.branchId) {
    try {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (!info.role) info.role = data?.role;
        if (!info.schoolId) info.schoolId = data?.schoolId;
        if (!info.branchId) info.branchId = data?.branchId;
        console.log(`[AuthGuard] Resolved user info from Firestore for ${decodedToken.email || decodedToken.uid}:`, info);
      } else {
        console.warn(`[AuthGuard] Firestore document not found for uid ${decodedToken.uid}`);
      }
    } catch (e: any) {
      console.error("[AuthGuard] Error resolving user info from Firestore:", e.message);
    }
  }

  // Hardcoded fallback for known super admin emails if role is still missing
  if (!info.role) {
    if (['spoorthy@school.local', 'pranesh@school.local'].includes(decodedToken.email)) {
      info.role = 'SUPER_ADMIN';
    } else {
      info.role = 'undefined';
    }
  }

  return info;
}

export async function validateTenantMiddleware(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const targetSchoolId = req.headers.get('x-school-id');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!targetSchoolId) {
    return NextResponse.json({ error: 'Missing x-school-id header' }, { status: 400 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const userInfo = await resolveUserInfo(decodedToken);

    // Super Admins bypass strict matching; standard users must match target school
    const isSuperAdmin = userInfo.role === 'super-admin' || userInfo.role === 'SUPER_ADMIN';
    const schoolMatches = userInfo.schoolId === targetSchoolId || userInfo.branchId === targetSchoolId;

    if (!isSuperAdmin && !schoolMatches) {
      console.log("[validateTenantMiddleware] REJECTED. Tenant mismatch. User role:", userInfo.role, "schoolId:", userInfo.schoolId, "branchId:", userInfo.branchId, "Target:", targetSchoolId);
      return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function withEnterpriseGuard(
  req: NextRequest,
  allowedRoles: string[],
  handler: (req: NextRequest, decodedToken: any) => Promise<NextResponse>
) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const userInfo = await resolveUserInfo(decodedToken);

    // Merge resolved values into decodedToken so handler has access to them
    decodedToken.role = userInfo.role;
    decodedToken.schoolId = userInfo.schoolId;
    decodedToken.branchId = userInfo.branchId;

    const role = userInfo.role;

    if (allowedRoles.length > 0 && !allowedRoles.includes(role) && role !== 'SUPER_ADMIN' && role !== 'super-admin') {
      console.log("[AuthGuard] REJECTED. Email:", decodedToken.email, "Computed Role:", role, "Allowed:", allowedRoles);
      return NextResponse.json({ error: `Forbidden: Insufficient privileges (Role: ${role})`, success: false }, { status: 403 });
    }

    return await handler(req, decodedToken);
  } catch (error) {
    console.error("[AuthGuard] Token validation/handler error:", error);
    return NextResponse.json({ error: 'Invalid token', success: false }, { status: 401 });
  }
}


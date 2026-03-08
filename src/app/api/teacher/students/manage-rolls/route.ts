import { NextResponse } from 'next/server';
import { adminAuth, adminDb, Timestamp } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // Verify the user is either an ADMIN or a validated TEACHER
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }
        const userRole = userDoc.data()?.role;
        const schoolId = userDoc.data()?.schoolId; // The teacher's school ID

        const payload = await request.json();
        const { classId, sectionId, updates } = payload;
        // updates = [{ studentId: "SHS00001", rollNumber: 1 }, { studentId: "SHS00002", rollNumber: 2 }]

        if (!classId || !sectionId || !Array.isArray(updates)) {
            return NextResponse.json({ error: 'Missing required configuration' }, { status: 400 });
        }

        // --- AUTHORIZATION CHECK ---
        let isAuthorized = false;
        if (userRole === "ADMIN") {
            isAuthorized = true;
        } else if (userRole === "TEACHER") {
            // Resolve Teacher ID from their UID
            const teacherSnap = await adminDb.collection("teachers").where("uid", "==", uid).limit(1).get();
            if (!teacherSnap.empty) {
                const tProfile = teacherSnap.docs[0].data();
                const tId = tProfile.schoolId || teacherSnap.docs[0].id;

                // Checking both the dedicated collection AND config/master_data for redundancy
                const key = `${classId}_${sectionId}`;
                const csDoc = await adminDb.collection("master_class_sections").doc(key).get();
                if (csDoc.exists && csDoc.data()?.classTeacherId === tId) {
                    isAuthorized = true;
                } else {
                    const configSnap = await adminDb.collection("config").doc("master_data").get();
                    if (configSnap.exists) {
                        const classSections = configSnap.data()?.class_sections || {};
                        Object.values(classSections).forEach((cs: any) => {
                            if (cs.classId === classId && cs.sectionId === sectionId && cs.classTeacherId === tId && (cs.active || cs.isActive)) {
                                isAuthorized = true;
                            }
                        });
                    }
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'You are not authorized to directly manage roll numbers for this specific section. Only Class Teachers and Admins can do this.' }, { status: 403 });
        }
        // -----------------------------

        // --- BATCH UPDATE ---
        const batch = adminDb.batch();
        let updateCount = 0;

        for (const update of updates) {
            if (!update.studentId || update.rollNumber === undefined) continue;

            const studentRef = adminDb.collection("students").doc(update.studentId);
            batch.update(studentRef, {
                rollNumber: Number(update.rollNumber),
                updatedAt: Timestamp.now()
            });
            updateCount++;

            // Commit every 490 to stay under 500 limit
            if (updateCount % 490 === 0) {
                await batch.commit();
            }
        }

        if (updateCount % 490 !== 0) {
            await batch.commit();
        }
        // ---------------------

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${updateCount} roll numbers.`,
        });

    } catch (error: any) {
        console.error("Error managing roll numbers:", error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

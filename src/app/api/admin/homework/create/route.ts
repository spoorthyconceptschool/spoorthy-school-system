import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue, adminMessaging } from "@/lib/firebase-admin";
import { createServerNotification, notifyManagerActionServer } from "@/lib/notifications-server";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Verify Admin Role
        const hasAdminRole = decodedToken.role === "SUPER_ADMIN" || decodedToken.role === "ADMIN" || decodedToken.role === "admin";
        const hasAdminEmail = decodedToken.email?.includes("admin") || decodedToken.email?.endsWith("@spoorthy.edu");

        if (!hasAdminRole && !hasAdminEmail) {
            // Check Firestore as final fallback
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
            const firestoreRole = userDoc.data()?.role;
            if (firestoreRole !== "ADMIN" && firestoreRole !== "SUPER_ADMIN") {
                return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
            }
        }

        const {
            classId,
            sectionId,
            subjectId,
            title,
            description,
            dueDate,
            yearId = "2025-2026"
        } = await req.json();

        if (!classId || !sectionId || !subjectId || !title || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch display names for Homework record
        // We use RTDB refs or just assume the frontend sends IDs that we can tag.
        // Actually, it's safer to store IDs and have student dashboard lookup or Store names for snapshotting.
        // Let's store Names for instant display.

        // Quick lookups from Firestore/RTDB would be slow here. 
        // Better: We assume the target IDs are what we filter by.

        const hwId = adminDb.collection("homework").doc().id;
        await adminDb.collection("homework").doc(hwId).set({
            id: hwId,
            yearId,
            classId, // Targeted Class ID
            sectionId, // Targeted Section ID
            subjectId, // Targeted Subject ID
            teacherId: "ADMIN",
            teacherName: "School Administration",
            isAdminPost: true,
            title,
            description,
            dueDate: dueDate || null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // ... (rest of imports)

        // 3. Audit Log
        await adminDb.collection("audit_logs").add({
            action: "ADMIN_CREATE_HOMEWORK",
            actorUid: decodedToken.uid,
            details: { classId, title },
            timestamp: FieldValue.serverTimestamp()
        });

        // 4. Send Notifications (FCM + In-App)
        try {
            // A. Fetch Target Students
            let studentQuery = adminDb.collection("students")
                .where("classId", "==", classId)
                .where("status", "==", "ACTIVE");

            if (sectionId !== "ALL" && sectionId !== "GENERAL") {
                studentQuery = studentQuery.where("sectionId", "==", sectionId);
            }

            const studentSnap = await studentQuery.get();
            const studentUids = studentSnap.docs.map(doc => doc.data().uid).filter(Boolean);

            if (studentUids.length > 0) {
                // Fetch User Tokens (Batching if needed, but for now simple loop or chunks)
                // Firestore limit for 'in' query is 10. We should iterate or just fetch users one by one?
                // Fetching all users is too much. 
                // Better: fetch tokens from user docs.

                // Optimized: split into chunks of 10 for 'in' query
                const chunks = [];
                for (let i = 0; i < studentUids.length; i += 10) {
                    chunks.push(studentUids.slice(i, i + 10));
                }

                let allTokens: string[] = [];
                for (const chunk of chunks) {
                    const userSnap = await adminDb.collection("users").where(FieldValue.documentId(), "in", chunk).get();
                    userSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                            allTokens.push(...data.fcmTokens);
                        }
                    });
                }

                // Send Multicast
                if (allTokens.length > 0) {
                    const uniqueTokens = [...new Set(allTokens)];
                    // Batch send (500 limit per batch)
                    const message = {
                        notification: {
                            title: `New Homework: ${title}`,
                            body: description.length > 50 ? description.substring(0, 50) + "..." : description,
                        },
                        data: {
                            type: "HOMEWORK",
                            homeworkId: hwId,
                            subjectId: subjectId,
                            click_action: "/student/homework"
                        },
                        tokens: uniqueTokens
                    };

                    const response = await adminMessaging.sendEachForMulticast(message);
                    console.log("[Homework FCM] Sent:", response.successCount, "Failed:", response.failureCount);
                }
            }

            // B. Create In-App Notification (One for the group)
            // Note: Currently we don't have GROUP notification support in client query easily without custom rules.
            // But we can create individual notifications for each student if needed, or rely on FCM.
            // For now, let's create a generic one targetting 'ALL_STUDENTS' if Class=ALL? No.
            // Let's create individual notifications for the students found? (Expensive if 100 students)
            // Or just rely on FCM for now as requested ("taskbar of mobile").

        } catch (notifError) {
            console.error("Notification Error:", notifError);
        }

        return NextResponse.json({ success: true, message: "Homework Posted and Notified" });

    } catch (error: any) {
        console.error("Admin Homework Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

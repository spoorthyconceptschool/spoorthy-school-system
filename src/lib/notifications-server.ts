import { adminDb, Timestamp } from "./firebase-admin";

export async function createServerNotification(props: {
    userId?: string;
    target?: string;
    title: string;
    message: string;
    type: string;
    actionBy?: string;
    actionByName?: string;
}) {
    try {
        await adminDb.collection("notifications").add({
            ...props,
            status: "UNREAD",
            createdAt: Timestamp.now()
        });

        // FCM Push
        if (props.userId || props.target === "admin" || props.target === "ALL_ADMINS") {
            try {
                // 1. Get User Logic
                let tokens: string[] = [];

                if (props.userId) {
                    let uid = props.userId;
                        // Check if userId is a UID (simple check: length usually 28 for firebase auth)
                    // Or fetch from 'users' collection directly.
                    const userSnap = await adminDb.collection("users").doc(uid).get();

                    if (userSnap.exists) {
                        tokens = userSnap.data()?.fcmTokens || [];
                    } else {
                        // Fallback: If userId is School ID (e.g. ST123), find the linked UID
                        // Try student collection
                        const sSnap = await adminDb.collection("students").doc(uid).get();
                        if (sSnap.exists && sSnap.data()?.uid) {
                            const linkedUser = await adminDb.collection("users").doc(sSnap.data()?.uid).get();
                            tokens = linkedUser.data()?.fcmTokens || [];
                        } else {
                            // Try teacher collection
                            const tSnap = await adminDb.collection("teachers").doc(uid).get();
                            if (tSnap.exists && tSnap.data()?.uid) {
                                const linkedUser = await adminDb.collection("users").doc(tSnap.data()?.uid).get();
                                tokens = linkedUser.data()?.fcmTokens || [];
                            }
                        }
                    }
                } else if (props.target === "admin" || props.target === "ALL_ADMINS") {
                    // Fetch all tokens for users with ADMIN or SUPER_ADMIN or MANAGER roles
                    const adminSnaps = await adminDb.collection("users").where("role", "in", ["ADMIN", "SUPER_ADMIN", "MANAGER"]).get();
                    adminSnaps.forEach((doc: any) => {
                        const fTokens = doc.data()?.fcmTokens;
                        if (Array.isArray(fTokens)) {
                            tokens.push(...fTokens);
                        }
                    });
                }

                if (tokens.length > 0) {
                    // Send Multicast
                    const { adminMessaging } = require("./firebase-admin");

                    if (adminMessaging) {
                        // adminMessaging is a Proxy, so we just call methods on it.
                        
                        // Determine Deep Link URL (Must be Absolute for PWA strict routing)
                        const baseUrl = "https://spoorthy-16292.web.app";
                        let linkUrl = `${baseUrl}/notifications`;
                        if (props.type === "HOMEWORK") linkUrl = `${baseUrl}/student/homework`;
                        else if (props.type === "FEE") linkUrl = `${baseUrl}/student/fees`;
                        else if (props.type === "NOTICE") linkUrl = `${baseUrl}/notifications`;
                        else if (props.type === "LEAVE_REQUEST") linkUrl = props.target === "admin" || props.target === "ALL_ADMINS" ? `${baseUrl}/admin/leaves` : `${baseUrl}/teacher/leaves`;
                        else if (props.type === "LEAVE_APPROVED") linkUrl = `${baseUrl}/student/leaves`;

                        await adminMessaging.sendEachForMulticast({
                            tokens: [...new Set(tokens)], // Ensure unique
                            notification: {
                                title: props.title,
                                body: props.message,
                            },
                            webpush: {
                                fcmOptions: {
                                    link: linkUrl
                                },
                                notification: {
                                    icon: "https://firebasestorage.googleapis.com/v0/b/spoorthy-16292.firebasestorage.app/o/demo%2Flogo.png?alt=media"
                                }
                            },
                            data: {
                                type: props.type,
                                url: linkUrl // Deep link if needed
                            }
                        });
                        console.log(`[FCM] Sent to ${tokens.length} devices for user ${props.userId}`);
                    }
                }

            } catch (fcmError) {
                console.error("[FCM Error]", fcmError);
            }
        }

    } catch (e) {
        console.error("Failed to create server notification:", e);
    }
}

export async function notifyManagerActionServer(props: {
    userId?: string;
    target?: string;
    title: string;
    message: string;
    type: string;
    actionBy: string;
    actionByName: string;
}) {
    // 1. Notify Admins
    await createServerNotification({
        ...props,
        target: "ALL_ADMINS",
        title: `[Manager Action] ${props.title}`
    });

    // 2. Notify specific user or group if provided
    if (props.userId || (props.target && props.target !== "ALL_ADMINS")) {
        await createServerNotification(props);
    }
}

/**
 * Sends a push notification to multiple users simultaneously using FCM Multicast.
 * Fetches FCM tokens from the 'users' collection for the provided UIDs.
 * 
 * @param uids - Array of User UIDs
 * @param notification - Object containing title and body
 * @param data - Optional data payload for deep linking
 */
export async function sendBulkPushNotifications(
    uids: string[],
    notification: { title: string; body: string },
    data?: Record<string, string>
) {
    if (!uids.length) return { success: true, count: 0 };

    try {
        const { adminMessaging, adminDb } = require("./firebase-admin");
        if (!adminMessaging) return { success: false, error: "Messaging not available" };

        const allTokens: string[] = [];
        
        // Firestore 'in' query limit is 30 in newer versions, but we'll use chunks of 25 for safety
        const chunkSize = 25;
        for (let i = 0; i < uids.length; i += chunkSize) {
            const chunk = uids.slice(i, i + chunkSize);
            const userSnap = await adminDb.collection("users")
                .where("__name__", "in", chunk)
                .get();

            userSnap.forEach((doc: any) => {
                const tokens = doc.data()?.fcmTokens;
                if (Array.isArray(tokens)) {
                    allTokens.push(...tokens);
                }
            });
        }

        const uniqueTokens = [...new Set(allTokens)];
        if (uniqueTokens.length === 0) return { success: true, count: 0 };

        // FCM multicast limit is 500 tokens per call
        let totalSent = 0;
        for (let i = 0; i < uniqueTokens.length; i += 500) {
            const tokenChunk = uniqueTokens.slice(i, i + 500);
            const response = await adminMessaging.sendEachForMulticast({
                tokens: tokenChunk,
                notification,
                webpush: {
                    fcmOptions: {
                        link: data?.url || data?.click_action || "/notifications"
                    },
                    notification: {
                        icon: "https://firebasestorage.googleapis.com/v0/b/spoorthy-16292.firebasestorage.app/o/demo%2Flogo.png?alt=media"
                    }
                },
                data: data || {}
            });
            totalSent += response.successCount;
        }

        console.log(`[FCM Bulk] Sent ${totalSent} notifications for ${uids.length} users.`);
        return { success: true, count: totalSent };

    } catch (error) {
        console.error("[FCM Bulk Error]", error);
        return { success: false, error };
    }
}

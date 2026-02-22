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
        if (props.userId) {
            try {
                // 1. Get User Logic (Direct UID or Student/Teacher ID lookup)
                let uid = props.userId;
                let tokens: string[] = [];

                // Check if userId is a UID (simple check: length usually 28 for firebase auth)
                // Or fetch from 'users' collection directly.
                const userSnap = await adminDb.collection("users").doc(uid).get();

                if (userSnap.exists) {
                    tokens = userSnap.data()?.fcmTokens || [];
                } else {
                    // Fallback: If userId is School ID (e.g. ST123), find the linked UID
                    // Try student collection
                    const sSnap = await adminDb.collection("students").doc(uid).get();
                    if (sSnap.exists() && sSnap.data()?.uid) {
                        const linkedUser = await adminDb.collection("users").doc(sSnap.data()?.uid).get();
                        tokens = linkedUser.data()?.fcmTokens || [];
                    } else {
                        // Try teacher collection
                        const tSnap = await adminDb.collection("teachers").doc(uid).get();
                        if (tSnap.exists() && tSnap.data()?.uid) {
                            const linkedUser = await adminDb.collection("users").doc(tSnap.data()?.uid).get();
                            tokens = linkedUser.data()?.fcmTokens || [];
                        }
                    }
                }

                if (tokens.length > 0) {
                    // Send Multicast
                    const { adminMessaging } = require("./firebase-admin");

                    if (adminMessaging) {
                        // adminMessaging is a Proxy, so we just call methods on it.
                        await adminMessaging.sendEachForMulticast({
                            tokens: [...new Set(tokens)], // Ensure unique
                            notification: {
                                title: props.title,
                                body: props.message,
                            },
                            data: {
                                type: props.type,
                                url: "/notifications" // Deep link if needed
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

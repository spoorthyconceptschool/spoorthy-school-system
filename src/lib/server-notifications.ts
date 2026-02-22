import "server-only";
import { getAdminDb } from "./firebase-admin";

export interface ServerNotificationProps {
    userId?: string;     // Specific user ID (Auth UID or School ID)
    target?: string;     // Group target like "ALL_ADMINS", "ALL_MANAGERS", "CLASS_XA"
    title: string;
    message: string;
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "FEE" | "LEAVE" | "NOTICE";
    actionBy?: string;   // UID/Email of the actor
    actionByName?: string;
}

export const sendServerNotification = async (props: ServerNotificationProps) => {
    try {
        const db = getAdminDb();
        if (!db) {
            console.warn("[ServerNotification] DB not available, skipping notification:", props.title);
            return;
        }

        const notifyCollection = db.collection("notifications");

        // Use server timestamp
        const payload = {
            ...props,
            userId: props.userId || null, // Ensure explicit null if undefined for clarity
            target: props.target || null,
            status: "UNREAD",
            createdAt: new Date(), // Admin SDK uses JS Date or Firestore Timestamp
            isServerGenerated: true
        };

        await notifyCollection.add(payload);

        // If target includes ALL_ADMINS, we might want to fan-out or just rely on query
        // "ALL_ADMINS" implies query where('target', '==', 'ALL_ADMINS').

        console.log(`[ServerNotification] Sent: ${props.title}`);

    } catch (e) {
        console.error("[ServerNotification] Failed:", e);
    }
};

export const notifyAdminsOfAction = async (action: string, details: string, actor: string) => {
    await sendServerNotification({
        target: "ALL_ADMINS",
        title: action,
        message: `${details} (Action by: ${actor})`,
        type: "INFO",
        actionBy: actor
    });
};

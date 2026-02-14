import { adminDb } from "./firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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

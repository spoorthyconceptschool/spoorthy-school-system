import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface CreateNotificationProps {
    userId?: string;     // Specific user ID (Auth UID or School ID depending on context)
    target?: string;     // Group target like "ALL_ADMINS", "class_K6O9...", etc.
    title: string;
    message: string;
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "FEE" | "LEAVE" | "NOTICE";
    actionBy?: string;   // UID of the person who did the action
    actionByName?: string;
}

export const createNotification = async (props: CreateNotificationProps) => {
    try {
        await addDoc(collection(db, "notifications"), {
            ...props,
            status: "UNREAD",
            createdAt: Timestamp.now()
        });
    } catch (e) {
        console.error("Failed to create notification:", e);
    }
};

/**
 * Special helper for Manager actions
 * Sends notification to ALL_ADMINS and optionally a specific user/target
 */
export const notifyManagerAction = async (props: CreateNotificationProps) => {
    // 1. Notify Admins
    await createNotification({
        ...props,
        target: "ALL_ADMINS",
        title: `[Manager Action] ${props.title}`
    });

    // 2. Notify specific user or group if provided
    if (props.userId || (props.target && props.target !== "ALL_ADMINS")) {
        await createNotification(props);
    }
};

import { NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, title, message, type, link, target } = body;

        // Write directly to existing notifications collection used by NotificationCenter
        const notifRef = adminDb.collection("notifications").doc();
        await notifRef.set({
            userId: userId || null, // Can be null if target is ALL
            target: target || "PERSONAL", // PERSONAL, ALL, ALL_ADMINS, class_XYZ
            title,
            message,
            type: type || "SYSTEM",
            link: link || null,
            status: "UNREAD",
            createdAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true, notificationId: notifRef.id });
    } catch (error: any) {
        console.error("Notifications API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

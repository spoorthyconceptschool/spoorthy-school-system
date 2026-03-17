import { sendBulkPushNotifications } from "./src/lib/notifications-server";
import { adminDb } from "./src/lib/firebase-admin";

async function verify() {
    console.log("--- Verification Started ---");
    
    // 1. Check if we can fetch users with tokens
    console.log("Fetching users with FCM tokens...");
    const userSnap = await adminDb.collection("users")
        .where("fcmTokens", "!=", null)
        .limit(5)
        .get();
        
    const uids = userSnap.docs.map((d: any) => d.id);
    console.log(`Found ${uids.length} users with tokens:`, uids);
    
    if (uids.length === 0) {
        console.warn("No users found with tokens. Testing with dummy UIDs...");
        uids.push("dummy_uid_1", "dummy_uid_2");
    }
    
    // 2. Test the bulk notification logic
    // We expect this to fetch tokens and try to send. 
    // If tokens are dummy, it should log attempts but fail gracefully or do nothing if no tokens found.
    console.log("Testing sendBulkPushNotifications...");
    const result = await sendBulkPushNotifications(
        uids,
        {
            title: "Test Verification",
            body: "This is a verification message for the attendance notification system."
        },
        { type: "TEST", date: new Date().toISOString() }
    );
    
    console.log("Result:", JSON.stringify(result, null, 2));
    console.log("--- Verification Finished ---");
}

verify().catch(console.error);

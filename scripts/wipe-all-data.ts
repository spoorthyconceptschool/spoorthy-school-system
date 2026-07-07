import { adminDb, adminAuth, adminRtdb } from "../src/lib/firebase-admin";

async function deleteCollection(db: FirebaseFirestore.Firestore, collectionPath: string, batchSize: number) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db: FirebaseFirestore.Firestore, query: FirebaseFirestore.Query, resolve: any) {
    const snapshot = await query.get();
    const batchSize = snapshot.docs.length;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

async function run() {
    console.log("STARTING FULL DATABASE WIPE...");

    // 1. Delete all Firestore Collections
    console.log("1. Fetching all Firestore collections...");
    try {
        const collections = await adminDb.listCollections();
        console.log(`Found ${collections.length} collections.`);
        for (const collection of collections) {
            console.log(`Deleting collection: ${collection.id}...`);
            await deleteCollection(adminDb, collection.id, 500);
            console.log(`Deleted collection: ${collection.id}`);
        }
    } catch (e) {
        console.log("Error deleting firestore collections:", e);
    }

    // 2. Delete all Firebase Auth Users
    console.log("2. Fetching all Auth Users...");
    try {
        let nextPageToken: string | undefined = undefined;
        let deletedUsers = 0;
        do {
            const listUsersResult: any = await adminAuth.listUsers(1000, nextPageToken);
            const uids = listUsersResult.users.map((user: any) => user.uid);
            if (uids.length > 0) {
                await adminAuth.deleteUsers(uids);
                deletedUsers += uids.length;
                console.log(`Deleted ${deletedUsers} users so far...`);
            }
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
        console.log(`Finished deleting all ${deletedUsers} Auth Users.`);
    } catch (e) {
        console.log("Error deleting auth users:", e);
    }

    // 3. Clear RTDB if it exists
    console.log("3. Wiping Realtime Database...");
    try {
        await adminRtdb.ref('/').remove();
        console.log("RTDB wiped.");
    } catch (e) {
        console.log("Error wiping RTDB:", e);
    }

    console.log("DATABASE WIPE COMPLETE.");
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

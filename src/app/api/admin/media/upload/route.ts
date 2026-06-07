import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Auth
        const authHeader = req.headers.get("Authorization");
        console.log("[Media Upload Route] received Authorization header:", authHeader ? authHeader.substring(0, 30) + "..." : "null/undefined");
        if (!authHeader?.startsWith("Bearer ")) {
            console.log("[Media Upload Route] Authorization header does not start with Bearer");
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        console.log("[Media Upload Route] Token value: '" + token + "' (length: " + (token ? token.length : 0) + ")");
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
            console.log("[Media Upload Route] Token verified successfully. UID:", decodedToken.uid);
        } catch (authError: any) {
            console.error("[Media Upload Route] Token verification failed:", authError.message || authError);
            return NextResponse.json({ success: false, error: "Unauthorized: " + authError.message }, { status: 401 });
        }

        // 2. Parse File
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const type = formData.get("type") as string || "media";
        const customPath = formData.get("path") as string; // NEW: Allow custom path from CMS
        const oldUrl = formData.get("oldUrl") as string;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
        }

        // Clean up previous file if oldUrl is provided
        if (oldUrl && oldUrl.includes("firebasestorage.googleapis.com")) {
            try {
                const decodedUrl = decodeURIComponent(oldUrl);
                const oIndex = decodedUrl.indexOf("/o/");
                if (oIndex !== -1) {
                    let pathWithParams = decodedUrl.substring(oIndex + 3);
                    const qIndex = pathWithParams.indexOf("?");
                    const filePath = qIndex !== -1 ? pathWithParams.substring(0, qIndex) : pathWithParams;
                    
                    const bIndex = decodedUrl.indexOf("/b/");
                    let bucketName = "";
                    if (bIndex !== -1) {
                        const afterB = decodedUrl.substring(bIndex + 3);
                        const nextSlash = afterB.indexOf("/");
                        if (nextSlash !== -1) {
                            bucketName = afterB.substring(0, nextSlash);
                        }
                    }

                    console.log(`[Upload API] Cleaning up old file: ${filePath}`);
                    const bucket = adminStorage.bucket(bucketName || undefined);
                    const fileObj = bucket.file(filePath);
                    const [exists] = await fileObj.exists();
                    if (exists) {
                        await fileObj.delete();
                        console.log(`[Upload API] Old file deleted successfully: ${filePath}`);
                    }
                }
            } catch (err: any) {
                console.warn("[Upload API] Failed to delete old file:", err.message);
            }
        }


        // --- NEW: MediaVault Integration (Updated for vault123.lovable.app) ---
        const mediaVaultUrl = process.env.NEXT_PUBLIC_MEDIA_VAULT_URL || "https://vault123.lovable.app/api/media/upload";
        const mediaVaultKey = process.env.MEDIA_VAULT_API_KEY;

        if (mediaVaultKey) {
            try {
                const buffer = Buffer.from(await file.arrayBuffer());
                const base64File = buffer.toString('base64');

                console.log(`[Upload API] Uploading to MediaVault: ${mediaVaultUrl}`);

                const vaultRes = await fetch(mediaVaultUrl, {
                    method: "POST",
                    headers: {
                        "apikey": mediaVaultKey,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        file: base64File,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        path: customPath || `settings/branding/${file.name}` // Pass custom path
                    })
                });
                // ... (rest of logic remains same)
                if (!vaultRes.ok) {
                    const errText = await vaultRes.text();
                    throw new Error(`MediaVault Error (${vaultRes.status}): ${errText}`);
                }

                const data = await vaultRes.json();
                console.log("[Upload API] MediaVault Success:", data);

                const item = Array.isArray(data) ? data[0] : data;
                let finalUrl = item.public_url || item.url; // Support both naming conventions

                if (finalUrl && finalUrl.startsWith("/")) {
                    const origin = new URL(mediaVaultUrl).origin;
                    finalUrl = `${origin}${finalUrl}`;
                }

                if (!finalUrl) {
                    throw new Error("MediaVault response missing URL");
                }

                return NextResponse.json({
                    success: true,
                    url: finalUrl,
                    path: item.id || item.path || "remote-file",
                    bucket: "media-vault"
                });

            } catch (vaultError: any) {
                console.error("[Upload API] MediaVault Failed, falling back to Firebase:", vaultError.message);
            }
        }
        // -----------------------------------

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${type}_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const filePath = customPath ? (customPath.endsWith('/') ? `${customPath}${fileName}` : customPath) : `settings/branding/${fileName}`;

        const possibleBuckets = [
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
        ].filter(Boolean);

        let lastError = null;
        let successfulBucket = "";
        let publicUrl = "";

        for (const bucketName of possibleBuckets) {
            try {
                console.log(`[Upload API] Attempting bucket: ${bucketName}`);
                const bucket = adminStorage.bucket(bucketName);
                const blob = bucket.file(filePath);

                const downloadToken = Date.now().toString();
                await blob.save(buffer, {
                    contentType: file.type,
                    metadata: {
                        metadata: {
                            firebaseStorageDownloadTokens: downloadToken,
                        }
                    }
                });

                successfulBucket = bucketName;
                const encodedPath = encodeURIComponent(filePath);
                publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
                console.log(`[Upload API] SUCCESS with bucket: ${bucketName}`);
                break;
            } catch (err: any) {
                console.warn(`[Upload API] FAILED bucket: ${bucketName} - ${err.message}`);
                lastError = err;
            }
        }

        if (!successfulBucket) {
            console.error(`[Upload API] All buckets failed: ${possibleBuckets.join(", ")}`);
            return NextResponse.json({
                success: false,
                error: `Storage bucket not found. Verified ${possibleBuckets.length} locations. Check Firebase console for bucket name.`,
                details: lastError?.message,
                tried: possibleBuckets
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            url: publicUrl,
            path: filePath,
            bucket: successfulBucket
        });

    } catch (error: any) {
        console.error("[API Media Upload] Critical Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

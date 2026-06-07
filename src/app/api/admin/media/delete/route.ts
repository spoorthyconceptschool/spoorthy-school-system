import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        // 2. Parse request
        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ success: false, error: "No URL provided" }, { status: 400 });
        }

        console.log(`[Delete API] Requested to delete URL: ${url}`);

        if (url.includes("firebasestorage.googleapis.com")) {
            const decodedUrl = decodeURIComponent(url);
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

                console.log(`[Delete API] Deleting from Storage: filePath=${filePath}, bucketName=${bucketName}`);
                const bucket = adminStorage.bucket(bucketName || undefined);
                const file = bucket.file(filePath);
                const [exists] = await file.exists();
                if (exists) {
                    await file.delete();
                    console.log(`[Delete API] File deleted successfully: ${filePath}`);
                } else {
                    console.log(`[Delete API] File does not exist in bucket: ${filePath}`);
                }
            }
        } else {
            console.log(`[Delete API] URL is not a Firebase Storage URL, skipping delete: ${url}`);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("[Delete API] Critical Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

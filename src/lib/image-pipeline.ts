/**
 * Image Pipeline Utility
 * Uses server-side API to bypass CORS and handle storage permissions.
 */

export async function uploadImageFromUrl(url: string, path: string, token: string): Promise<string> {
    try {
        const formData = new FormData();
        formData.append("url", url);
        formData.append("path", path);

        const response = await fetch("/api/admin/media/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed");

        return data.url;
    } catch (error: any) {
        console.error("[ImagePipeline] Error:", error);
        throw error;
    }
}

export async function uploadFile(file: File, path: string, token: string): Promise<string> {
    try {
        // Bypass Server limits for Videos or large files using Direct Firebase Client Upload
        if (file.type.startsWith('video/') || file.size > 2 * 1024 * 1024) {
            const { storage } = await import('@/lib/firebase');
            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

            const fileRef = ref(storage, `${path}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-]/g, "")}`);

            // Upload directly to client storage
            const uploadSnapshot = await uploadBytes(fileRef, file, { contentType: file.type });
            const url = await getDownloadURL(uploadSnapshot.ref);
            return url;
        }

        // Standard proxied approach for smaller images (MediaVault compression, etc.)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", path);

        const response = await fetch("/api/admin/media/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed");

        return data.url;
    } catch (error: any) {
        console.error("[ImagePipeline] Error:", error);
        throw error;
    }
}

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

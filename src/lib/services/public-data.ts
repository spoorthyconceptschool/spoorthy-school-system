import { adminRtdb } from "@/lib/firebase-admin";

export async function getPublicHeroContent() {
    try {
        const snap = await adminRtdb.ref('siteContent/home/hero').get();
        if (snap.exists()) {
            const data = snap.val();
            if (data && typeof data === 'object') return data;
        }
    } catch (e) {
        console.error("Error fetching public hero content:", e);
    }
    return {
        title: "Learn Today Lead Tommorrow",
        subtitle: "Innovation meets tradition.",
        videoUrl: "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/51d8a5ee-ebad-48e0-9617-b96d7911ac8b.mp4",
        posterUrl: "https://firebasestorage.googleapis.com/v0/b/spoorthy-16292.firebasestorage.app/o/demo%2Fhero-poster.jpg?alt=media"
    };
}

export async function getPublicSectionsContent() {
    try {
        const snap = await adminRtdb.ref('siteContent/home/sections').get();
        if (snap.exists()) {
            const data = snap.val();
            
            // Normalize sections that are expected to be arrays
            const normalized = { ...data };

            if (data.facilities && typeof data.facilities === 'object' && !Array.isArray(data.facilities)) {
                normalized.facilities = Object.values(data.facilities)
                    .filter((i: any) => i && i.isPublished)
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            } else if (Array.isArray(data.facilities)) {
                normalized.facilities = data.facilities
                    .filter((i: any) => i && i.isPublished)
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            }

            if (data.gallery && typeof data.gallery === 'object' && !Array.isArray(data.gallery)) {
                normalized.gallery = Object.values(data.gallery).filter(Boolean);
            }

            // Ensure these keys exist at least as empty arrays/objects to prevent client crashes
            normalized.facilities = normalized.facilities || [];
            normalized.gallery = normalized.gallery || [];
            normalized.leadership = normalized.leadership || {};
            normalized.testimonials = normalized.testimonials || [];
            normalized.contact = normalized.contact || {};

            return normalized;
        }
    } catch (e) {
        console.error("Error fetching public sections content:", e);
    }
    return {
        facilities: [],
        leadership: {},
        whyUs: {},
        gallery: [],
        testimonials: [],
        contact: {}
    };
}

export async function getPublicBranding() {
    try {
        const snap = await adminRtdb.ref('siteContent/branding').get();
        if (snap.exists()) {
            return snap.val();
        }
    } catch (e) {
        console.error("Error fetching public branding:", e);
    }
    return {
        schoolName: "Spoorthy Concept School",
        schoolLogo: null
    };
}

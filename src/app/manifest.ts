import { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    let schoolName = 'Spoorthy Concept School';
    let shortName = 'Spoorthy';
    let iconUrl = '/icons/icon-192x192.png';
    let iconUrl512 = '/icons/icon-512x512.png';

    try {
        const { adminRtdb } = await import('@/lib/firebase-admin');
        const snap = await adminRtdb.ref('siteContent/branding').once('value');
        if (snap.exists()) {
            const data = snap.val();
            if (data.schoolName) {
                schoolName = data.schoolName;
                shortName = data.schoolName.substring(0, 15);
            }
            if (data.schoolLogo) {
                // If they change the logo, use it for the App shortcut!
                // Manifest requires exact sizes usually, but mobile OS scales them
                iconUrl = data.schoolLogo;
                iconUrl512 = data.schoolLogo;
            }
        }
    } catch (e) {
        console.warn("Failed to fetch branding for manifest", e);
    }

    return {
        name: schoolName,
        short_name: shortName,
        description: `Management System for ${schoolName}`,
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0A0B',
        categories: ['education', 'productivity', 'utilities'],
        orientation: 'portrait-primary',
        shortcuts: [
            {
                name: "Student Dashboard",
                short_name: "Student",
                description: "View your classes and homework",
                url: "/student/dashboard",
                icons: [{ src: iconUrl, sizes: "192x192" }]
            },
            {
                name: "Teacher Portal",
                short_name: "Teacher",
                description: "Manage attendance and classes",
                url: "/teacher/dashboard",
                icons: [{ src: iconUrl, sizes: "192x192" }]
            }
        ],
        related_applications: [],
        prefer_related_applications: false,
        icons: [
            {
                src: iconUrl,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: iconUrl,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: iconUrl512,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: iconUrl512,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}

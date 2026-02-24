import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Spoorthy Concept School',
        short_name: 'Spoorthy',
        description: 'Management System for Spoorthy Concept School',
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
                icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }]
            },
            {
                name: "Teacher Portal",
                short_name: "Teacher",
                description: "Manage attendance and classes",
                url: "/teacher/dashboard",
                icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }]
            }
        ],
        related_applications: [],
        prefer_related_applications: false,
        icons: [
            {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}

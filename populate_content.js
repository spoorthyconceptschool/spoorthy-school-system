const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env vars
const env = dotenv.parse(fs.readFileSync('.env.local'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

const content = {
    hero: {
        title: "Where Futures Begin.",
        subtitle: "Excellence in Education",
        videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4"
    },
    leadership: {
        chairman: {
            name: "Mr. Spoorthy Reddy",
            title: "Chairman",
            photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a"
        },
        principal: {
            name: "Mrs. Lakshmi",
            title: "Principal",
            photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2"
        }
    },
    facilities: {
        f1: {
            id: "f1",
            title: "Smart Labs",
            desc: "State-of-the-art computer labs with high-speed internet and modern software for digital learning.",
            image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
            order: 1,
            isPublished: true
        },
        f2: {
            id: "f2",
            title: "Library",
            desc: "A vast collection of books, journals, and digital resources to fuel curiosity and learning.",
            image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f",
            order: 2,
            isPublished: true
        },
        f3: {
            id: "f3",
            title: "Sports Complex",
            desc: "Comprehensive sports facilities including basketball, cricket, and indoor games for holistic development.",
            image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5",
            order: 3,
            isPublished: true
        },
        f4: {
            id: "f4",
            title: "Science Labs",
            desc: "Fully equipped physics, chemistry, and biology labs for hands-on scientific experiments.",
            image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d",
            order: 4,
            isPublished: true
        }
    },
    gallery: [
        "https://images.unsplash.com/photo-1560785496-3c9d27877182",
        "https://images.unsplash.com/photo-1546410531-bb4caa6b424d",
        "https://images.unsplash.com/photo-1509062522246-3755977927d7",
        "https://images.unsplash.com/photo-1596496053493-27f272c72b9a"
    ]
};

db.ref('siteContent/home').set(content)
    .then(() => {
        console.log('Site content populated successfully');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error populating content:', err);
        process.exit(1);
    });

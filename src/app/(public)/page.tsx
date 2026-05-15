import { Hero } from "@/components/landing/Hero";
import { ContactBand, Facilities, GalleryPreview, Leadership, Testimonials, WhyUs, Footer } from "@/components/landing/Sections";
import { getPublicHeroContent, getPublicSectionsContent } from "@/lib/services/public-data";

// Zero-Latency Pillar: SSG
export const revalidate = 3600; // Revalidate every hour

export default async function LandingPage() {
    const [heroContent, sectionsContent] = await Promise.all([
        getPublicHeroContent(),
        getPublicSectionsContent()
    ]);

    return (
        <main className="bg-[#0a0a0a] min-h-screen text-foreground overflow-x-hidden selection:bg-accent selection:text-black">
            <Hero initialContent={heroContent} />

            <div className="relative z-10">
                <Facilities content={sectionsContent?.facilities} />
                <Leadership content={sectionsContent?.leadership} />
                <WhyUs content={sectionsContent?.whyUs} />
                <GalleryPreview content={sectionsContent?.gallery} />
                <Testimonials content={sectionsContent?.testimonials} />
                <ContactBand content={sectionsContent?.contact} />
                <Footer />
            </div>
        </main>
    );
}

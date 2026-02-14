import { Hero } from "@/components/landing/Hero";
import { ContactBand, Facilities, GalleryPreview, Leadership, Testimonials, WhyUs, Footer } from "@/components/landing/Sections";
import ThreeBackground from "@/components/landing/ThreeBackground";

export default function LandingPage() {
    return (
        <main className="bg-[#0a0a0a] min-h-screen text-foreground overflow-x-hidden selection:bg-accent selection:text-black">
            <Hero />

            <div className="relative z-10">
                <Facilities />
                <Leadership />
                <WhyUs />
                <GalleryPreview />
                <Testimonials />
                <ContactBand />
                <Footer />
            </div>

            {/* 3D Background Layer - Disabled for Performance */}
            {/* <ThreeBackground /> */}
        </main>
    );
}

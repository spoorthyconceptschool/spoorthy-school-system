import { getPublicBranding } from "@/lib/services/public-data";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { SmoothScroll } from "@/components/public/SmoothScroll";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    const branding = await getPublicBranding();

    return (
        <SmoothScroll>
            <div className="min-h-screen bg-[#0A192F] text-white font-sans selection:bg-accent selection:text-black">
                <PublicNavbar initialBranding={branding} />
                <main className="relative z-10">
                    {children}
                </main>
            </div>
        </SmoothScroll>
    );
}

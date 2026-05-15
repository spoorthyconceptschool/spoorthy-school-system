import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from "@/context/AuthContext";
import { MasterDataProvider } from "@/context/MasterDataContext";
import { Toaster } from "@/components/ui/toaster";
import { NotificationManager } from "@/components/notification-manager";
import { FCMTokenManager } from "@/components/fcm-token-manager";
import { InstallPrompt } from "@/components/install-prompt";
import { LiveUpdatePrompt } from "@/components/live-update-prompt";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display', // Premium branding font
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'Spoorthy Concept School',
  description: 'A premium educational institution.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Spoorthy School',
  },
  icons: {
    icon: [
      { url: '/icon.png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  }
};

export const viewport = {
  themeColor: '#0A192F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

import { SpeculativeLoader } from "@/components/speculative-loader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, outfit.variable, "dark")} suppressHydrationWarning>
      <body className={`font-body antialiased bg-background text-foreground overflow-x-hidden`} suppressHydrationWarning>
        <div id="global-loader" className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-emerald-400 to-accent z-[9999] transform -translate-x-full transition-transform duration-500 ease-out opacity-0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Zero-Latency Navigation Listener
              let progressTimer;
              function startProgress() {
                const loader = document.getElementById('global-loader');
                if (!loader) return;
                loader.style.opacity = '1';
                loader.style.transform = 'translateX(-20%)';
                
                let progress = -20;
                clearInterval(progressTimer);
                progressTimer = setInterval(() => {
                    progress += (Math.random() * 2);
                    if (progress > -5) {
                        loader.style.transform = 'translateX(' + progress + '%)';
                    }
                    if (progress > -2) clearInterval(progressTimer);
                }, 100);
              }

              function stopProgress() {
                const loader = document.getElementById('global-loader');
                if (!loader) return;
                clearInterval(progressTimer);
                loader.style.transform = 'translateX(0%)';
                setTimeout(() => {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.style.transform = 'translateX(-100%)';
                    }, 300);
                }, 200);
              }

              // Bind to all clicks that look like navigations
              document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link && link.href && !link.target && !link.href.includes('#')) {
                    startProgress();
                }
              });

              // Also bind to form submissions
              document.addEventListener('submit', () => startProgress());
              
              // Stop on load/popstate
              window.addEventListener('popstate', () => stopProgress());
              window.addEventListener('load', () => stopProgress());
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', (e) => {
                const isNetwork = e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK');
                const isChunk = e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'));
                if (isNetwork || isChunk) {
                  if (!sessionStorage.getItem('app_reloaded')) {
                    sessionStorage.setItem('app_reloaded', 'true');
                    console.warn('Caught PWA Asset desync, unregistering Service Workers and healing DOM...');
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then((regs) => {
                        for (let reg of regs) { reg.unregister(); }
                        window.location.reload(true);
                      });
                    } else {
                      window.location.reload(true);
                    }
                  }
                }
              }, true);
            `,
          }}
        />
        <AuthProvider>
          <MasterDataProvider>
            {children}
            <SpeculativeLoader />
          </MasterDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

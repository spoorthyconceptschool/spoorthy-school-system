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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, outfit.variable, "dark")} suppressHydrationWarning>
      <body className={`font-body antialiased bg-background text-foreground overflow-x-hidden`} suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', (e) => {
                if (e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
                  console.warn('Caught ChunkLoadError, reloading page...', e);
                  window.location.reload();
                }
              }, true);
              window.addEventListener('unhandledrejection', (e) => {
                if (e.reason && (e.reason.name === 'ChunkLoadError' || (e.reason.message && e.reason.message.includes('Loading chunk')))) {
                  console.warn('Caught unhandled ChunkLoadError rejection, reloading page...', e);
                  window.location.reload();
                }
              });
            `,
          }}
        />
        <AuthProvider>
          <MasterDataProvider>
            {children}
            <NotificationManager />
            <FCMTokenManager />
            <InstallPrompt />
            <LiveUpdatePrompt />
          </MasterDataProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

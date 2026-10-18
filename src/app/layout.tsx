import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeProvider';
import { DynamicBackground } from '@/components/shared/DynamicBackground';

export const metadata: Metadata = {
  metadataBase: new URL('https://grouphub-2305e.web.app'),
  title: {
    default: 'GroupHub',
    template: `%s | GroupHub`,
  },
  description: 'Discover events, join groups, and connect with your community on GroupHub.',
  manifest: '/manifest.json',
  themeColor: '#FFFFFF',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GroupHub',
  },
  openGraph: {
    title: 'GroupHub',
    description: 'Discover events, join groups, and connect with your community.',
    url: 'https://grouphub-2305e.web.app',
    siteName: 'GroupHub',
    images: [
      {
        url: '/icon.svg',
        width: 800,
        height: 600,
        alt: 'GroupHub Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Font links remain in head as they are external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background text-foreground">
        <DynamicBackground />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="ui-theme">
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PlatformIdentityProvider } from "@/lib/platform-identity";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#d97706",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "BrandForge — Forge Your Brand Empire",
  description: "All-in-one brand operations management portal for modern businesses",
  keywords: ["BrandForge", "brand management", "order management", "inventory", "team collaboration", "business operations", "SaaS"],
  authors: [{ name: "BrandForge" }],
  icons: {
    icon: "/brandforge-logo.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "BrandForge — Forge Your Brand Empire",
    description: "All-in-one brand operations management portal for modern businesses",
    type: "website",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `.font-cinzel, h1.font-cinzel, .brand-title { font-family: 'Cinzel', serif !important; }`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ReactQueryProvider>
          <PlatformIdentityProvider>
            {children}
          </PlatformIdentityProvider>
        </ReactQueryProvider>
        <ServiceWorkerRegistrar />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

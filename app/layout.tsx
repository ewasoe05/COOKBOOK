import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/site-chrome";
import { ThemeProvider } from "@/components/theme-provider";
import { HydrateStore } from "@/components/hydrate-store";
import { ApiKeyBanner } from "@/components/api-key-banner";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Adaptive Cookbook",
    template: "%s · Adaptive Cookbook",
  },
  description:
    "A personal cookbook that writes weeks of meals around your body, kitchen, and taste.",
  applicationName: "Adaptive Cookbook",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cookbook",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F2E7" },
    { media: "(prefers-color-scheme: dark)", color: "#241E18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-base text-foreground antialiased">
        <ThemeProvider>
          <ApiKeyBanner />
          <SiteHeader />
          <HydrateStore>
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-28 sm:px-6 sm:py-12">
              {children}
            </main>
          </HydrateStore>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}

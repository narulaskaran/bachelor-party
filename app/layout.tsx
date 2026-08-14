import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { SiteNav } from "@/components/site-nav";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Generic pre-auth metadata: no names, dates, or places.
export const metadata: Metadata = {
  title: "The Big Send",
  description: "Private trip site. Password's in the group chat.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Marketing chrome only. Trip branding lives in app/[slug]/layout.tsx so a
  // leftover bp_access cookie cannot paint `/` (or admin/404) with the private
  // trip name, dates, or in-trip section links.
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full min-w-0 scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full min-w-0 flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <SiteNav />
          <main className="min-w-0 flex-1">{children}</main>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

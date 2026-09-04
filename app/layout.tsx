import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

// Generic pre-auth metadata: no names, dates, or places.
export const metadata: Metadata = {
  title: "Party Time",
  description:
    "Paste a messy plan. Guests get a private link, not a group-chat password.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full min-w-0 scroll-smooth antialiased`}
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

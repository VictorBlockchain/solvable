import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import dynamic from 'next/dynamic'
import { Footer } from "@/components/shared/Footer";
import Providers from "./providers";

const HeaderClient = dynamic(() => import("@/components/shared/Header").then(m => m.Header), {
  ssr: false,
})

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "solvable - puzzle battleground for ai agents",
  description: "Ai agents propose & try to solve puzzles and earn rewards",
  keywords: ["Solvable", "AI agents", "SEI blockchain", "x402 protocol", "puzzles", "math", "smart contracts", "dexsta"],
  authors: [{ name: "dexsta.fun" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "solvable - puzzle battleground for ai agents",
    description: "Ai agents propose & try to solve puzzles and earn rewards",
    url: "https://gobit.dexsta.fun",
    siteName: "solvable",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "solvable - puzzle battleground for ai agents",
    description: "Ai agents propose & try to solve puzzles and earn rewards",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <Providers>
          <HeaderClient />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

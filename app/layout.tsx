import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AI Oil Painting Generator – Turn Your Photo into an Oil Painting",
  description: "Turn your favorite photo into a beautiful oil painting with AI. Upload a JPG, PNG, or WebP image and download your artwork in moments.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AI Oil Painting Generator | Canvasly",
    description: "Bring a painterly touch to a moment you love. Turn your photo into an oil painting with AI.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

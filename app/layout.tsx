import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Canvasly",
  title: "AI Oil Painting Generator | Turn Photos into Oil Paintings",
  description: "Turn a photo into an oil painting with Canvasly’s AI oil painting generator. Upload a JPG, PNG, or WebP image, create your artwork, and download it.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "AI Oil Painting Generator | Canvasly",
    description: "Turn your photo into an oil painting with AI. Upload a JPG, PNG, or WebP image and download your artwork.",
    type: "website",
    siteName: "Canvasly",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "AI Oil Painting Generator | Canvasly",
    description: "Turn your photo into an oil painting with AI.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Canvasly AI Oil Painting Generator",
              url: SITE_URL,
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Web",
              description: "A web app that turns an uploaded photo into an AI-generated oil painting.",
              featureList: ["Upload a JPG, PNG, or WebP photo up to 4 MB", "Generate an oil painting from a photo", "Download the generated painting"],
            }),
          }}
        />
      </body>
    </html>
  );
}

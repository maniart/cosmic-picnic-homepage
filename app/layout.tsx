import type { Metadata } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cosmic Picnic: Meditate out loud",
  description:
    "Active meditation with your voice. Hum, tone, and let the sound answer back. Join the iPhone beta.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Cosmic Picnic: Meditate out loud",
    description:
      "Active meditation with your voice. Hum, tone, and let the sound answer back. Join the iPhone beta.",
    url: "https://cosmicpicnic.app",
    siteName: "Cosmic Picnic",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://cosmicpicnic.app/landing-page-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Cosmic Picnic — Meditate out loud",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cosmic Picnic: Meditate out loud",
    description:
      "Active meditation with your voice. Hum, tone, and let the sound answer back. Join the iPhone beta.",
    images: ["https://cosmicpicnic.app/landing-page-og-image.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`}>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-637WQQ121T" strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-637WQQ121T');
      `}</Script>
      <body>{children}</body>
    </html>
  );
}

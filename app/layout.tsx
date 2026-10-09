import type { Metadata } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";
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
  openGraph: {
    title: "Cosmic Picnic: Meditate out loud",
    description:
      "Active meditation with your voice. Hum, tone, and let the sound answer back. Join the iPhone beta.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  );
}

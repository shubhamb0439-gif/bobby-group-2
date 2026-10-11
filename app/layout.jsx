import "./globals.css";
import { display, body } from "./fonts";
import SmoothScroll from "@/components/SmoothScroll";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const DESCRIPTION =
  "Bobby Group is an Indian spice exporter headquartered in Bangalore, supplying green cardamom, black pepper, turmeric, cinnamon, Teja S17 red chilli, cloves and robusta coffee beans to importers, distributors and food manufacturers worldwide.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bobby Group | Indian Spice Exporter in Bangalore",
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Indian spice exporter",
    "spice exporter Bangalore",
    "green cardamom exporter",
    "black pepper exporter India",
    "turmeric exporter",
    "Teja S17 red chilli",
    "bulk spice supplier",
    "robusta coffee beans exporter",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: SITE_URL,
    title: "Bobby Group | Indian Spice Exporter in Bangalore",
    description: DESCRIPTION,
    images: [{ url: "/logo.png", width: 680, height: 264, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bobby Group | Indian Spice Exporter in Bangalore",
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Set these in the host's environment variables to verify ownership.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  // Icons come from app/icon.png and app/apple-icon.png via the file convention.
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}

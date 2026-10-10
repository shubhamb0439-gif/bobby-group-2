import "./globals.css";
import { display, body } from "./fonts";
import SmoothScroll from "@/components/SmoothScroll";

export const metadata = {
  title: "Bobby Group | Indian Exporter, Bengaluru",
  description:
    "Bobby Group is headquartered in Bangalore and exports premium Indian spices to importers, distributors and food manufacturers worldwide.",
  icons: { icon: "/logo.png" },
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

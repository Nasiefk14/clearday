import type { Metadata, Viewport } from "next";
import { Nunito, Space_Grotesk } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Clearday",
  description: "Know exactly when you'll be debt-free. Free, private and simple.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} ${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}

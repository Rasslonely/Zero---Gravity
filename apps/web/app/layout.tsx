import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zero-Gravity | The Shadow Card",
  description: "Spend your Starknet vault balance at any Bitcoin Cash merchant—instantly, privately, without bridging a single token.",
  icons: {
    icon: [
      { url: "/zero-gravity.png", sizes: "64x64", type: "image/png" }
    ],
    apple: "/zero-gravity.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} font-space antialiased bg-[#030305] text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

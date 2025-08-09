import type { Metadata } from "next";
import { Hedvig_Letters_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Hedvig_Letters_Sans({
  subsets: ["latin"],
  weight: ["400"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oasis",
  description: "The AI operating system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} ${geistMono.variable} antialiased`}>
        <div className="h-screen w-screen">{children}</div>
      </body>
    </html>
  );
}

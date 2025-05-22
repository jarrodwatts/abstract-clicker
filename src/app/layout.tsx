import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AbstractWalletWrapper from "@/components/AbstractWalletProvider";
import BackgroundMusic from "@/components/BackgroundMusic";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Axestract",
  description:
    "A demo game showcasing Abstracts new realtime JSON RPC endpoint.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BackgroundMusic />
        <AbstractWalletWrapper>{children}</AbstractWalletWrapper>
      </body>
    </html>
  );
}

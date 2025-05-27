import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import AbstractWalletWrapper from "@/components/AbstractWalletProvider";
import BackgroundMusic from "@/components/BackgroundMusic";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  weight: "400",
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
      <body className={`${pressStart2P.variable} antialiased`}>
        <BackgroundMusic />
        <AbstractWalletWrapper>{children}</AbstractWalletWrapper>
      </body>
    </html>
  );
}

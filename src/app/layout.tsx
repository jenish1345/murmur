import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display-face", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Murmur — review pull requests by talking",
  description:
    "Paste a GitHub PR, talk through your review, and Murmur turns the ramble into precise inline comments, each tied to the sentence you said. Built with Wispr Flow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} ${display.variable} antialiased`}>{children}</body>
    </html>
  );
}

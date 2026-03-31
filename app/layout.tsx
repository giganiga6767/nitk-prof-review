// app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
// 1. Import the wrapper
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NITK Faculty Reviews",
  description: "Honest, anonymous professor reviews for NITK Surathkal students.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <body className="font-[var(--font-dm,sans-serif)] antialiased">
        {/* 2. Wrap the children here */}
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
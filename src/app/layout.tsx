import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/provider";
import LoadingIndicator from "@/components/Loading";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BETOKPH Casino",
  description: "Casino gaming frontend with GCash cashier flows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${geistSans.className} max-w-[1920px] bg-white mx-auto`}>
        <LoadingIndicator />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

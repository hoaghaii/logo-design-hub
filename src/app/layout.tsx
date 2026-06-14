import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
import { WalletProvider } from "@/lib/web3/wallet-context";
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
  title: "LogoDesignHub — Sàn thiết kế freelance",
  description:
    "Marketplace kết nối Client và Designer với escrow thanh toán an toàn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50">
        <WalletProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Toaster richColors position="top-right" />
        </WalletProvider>
      </body>
    </html>
  );
}

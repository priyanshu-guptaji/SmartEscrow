import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/context/Web3Provider";

export const metadata: Metadata = {
  title: "SmartEscrow | AI-Powered Web3 Conditional Payments",
  description: "Create secure, conditional Web3 cryptocurrency payments using natural language. Fast, decentralized, and trustless escrows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#f8fafc] text-slate-900 flex flex-col antialiased font-sans">
        <Web3Provider>
          <div className="relative z-10 flex flex-col flex-1">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}

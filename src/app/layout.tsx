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
    <html
      lang="en"
      className="h-full antialiased dark"
      style={{ colorScheme: 'dark' }}
    >
      <body className="min-h-full bg-[#070a13] text-slate-100 flex flex-col antialiased font-sans">
        <Web3Provider>
          {/* Glow ambient backgrounds */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-glow-purple" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-glow-blue" />
          </div>
          <div className="relative z-10 flex flex-col flex-1">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/context/WalletContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title:       "Private Cross-Chain RFQ Desk",
  description:
    "Privacy-preserving OTC trading powered by Encrypt REFHE (FHE) and Ika dWallet (2PC-MPC). " +
    "Built for the Solana Colosseum Frontier Hackathon.",
  keywords:    ["Solana", "FHE", "dWallet", "OTC", "RFQ", "Encrypt", "Ika", "cross-chain"],
  authors:     [{ name: "Private RFQ Desk" }],
  openGraph: {
    title:       "Private Cross-Chain RFQ Desk",
    description: "Trade cross-chain assets with sealed bids — price discovery without price exposure.",
    type:        "website",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-void text-text antialiased min-h-screen">
        <AppProviders>{children as any}</AppProviders>
      </body>
    </html>
  );
}

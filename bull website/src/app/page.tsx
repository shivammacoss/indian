"use client";

import Navigation from "@/components/sections/navigation";
import HeroSection from "@/components/sections/hero";
import InvestStockTokens from "@/components/sections/invest-stock-tokens";
import CryptoPromo from "@/components/sections/crypto-promo";
import PerpetualFutures from "@/components/sections/perpetual-futures";
import SecurityTrust from "@/components/sections/security-trust";
import Footer from "@/components/sections/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main>
        <HeroSection />
        <InvestStockTokens />
        <CryptoPromo />
        <PerpetualFutures />
        <SecurityTrust />
      </main>
      <Footer />
    </div>
  );
}

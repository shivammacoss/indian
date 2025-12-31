import React from 'react';
import Image from 'next/image';

const InvestStockTokens = () => {
  return (
    <section className="bg-[#CFF12F] text-black overflow-hidden">
      <div className="container mx-auto px-6 md:px-[60px] py-20 md:py-[140px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[120px] items-start">
          
          {/* Left Side: Mobile App UI Mockup */}
          <div className="relative flex justify-center lg:justify-start">
            <div className="max-w-[540px] w-full">
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/home-invest-ui-desktop-2.png"
                alt="Explore Stock Tokens mobile app interface"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>

          {/* Right Side: Content */}
          <div className="flex flex-col max-w-[480px]">
            {/* Label */}
            <h3 className="font-sans text-[18px] font-medium leading-[1.2] mb-6 tracking-tight opacity-80">
              Invest
            </h3>

            {/* Headline */}
            <h2 className="font-display text-[48px] md:text-[64px] font-light leading-[1.1] mb-8 tracking-[-0.02em]">
              Get started with<br />Stock Tokens
            </h2>

            {/* Description */}
            <div className="font-sans text-[18px] leading-[1.6] mb-10 text-black/90">
              Explore 2,000+ Stock Tokens linked to NVIDIA, Microsoft, Apple, Vanguard S&P 500 ETF, and more. Stock Tokens are derivatives that reflect the price of individual stocks and ETPs.
            </div>

            {/* CTA Button */}
            <div className="mb-20">
              <a
                href="#"
                className="inline-block bg-black text-white px-8 py-[14px] rounded-[24px] font-sans font-medium text-[16px] hover:opacity-90 transition-opacity"
              >
                Learn more
              </a>
            </div>

            {/* Detailed Risk Disclaimer */}
            <div className="mt-auto">
              <p className="font-sans text-[12px] leading-[1.6] text-black/70">
                Stock Tokens are derivative contracts between you and Bull4x. They are priced at the prices of the underlying securities without granting rights to them. Stock Tokens carry a high level of risk and are not appropriate for all investors. Investors may lose up to the full amount of their invested capital due to market conditions or the insolvency of Bull4x. Please review the{' '}
                <a 
                  href="#" 
                  className="underline hover:text-black transition-colors"
                >
                  Description of the Services, Financial Instruments, and Risks
                </a>
                {' '}and the{' '}
                <a 
                  href="#" 
                  className="underline hover:text-black transition-colors"
                >
                  Key Information Document
                </a>
                {' '}and fully understand all associated risks before investing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InvestStockTokens;
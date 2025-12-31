import React from 'react';
import Image from 'next/image';

const PerpetualFutures = () => {
  return (
    <section className="bg-black text-white py-[80px] md:py-[140px] overflow-hidden">
      <div className="container px-[24px] md:px-[60px] max-w-[1440px] mx-auto">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-[64px] lg:gap-[80px]">
          
          {/* Left Side: UI Mockup */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[500px]">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/landing-futures-ui-desktop_2x-4.png"
                alt="Perpetual Futures trading interface on a mobile device"
                width={500}
                height={642}
                priority
                className="object-contain w-full h-auto"
              />
            </div>
          </div>

          {/* Right Side: Content */}
          <div className="w-full lg:w-[480px] flex flex-col pt-0 lg:pt-[40px]">
            {/* Label */}
            <div className="mb-[12px]">
              <h3 className="text-[#999999] font-sans text-[14px] md:text-[18px] font-medium tracking-normal leading-[1.2] uppercase lg:normal-case">
                Perpetual Futures
              </h3>
            </div>

            {/* Headline */}
            <div className="mb-[24px]">
              <h2 className="font-display text-[40px] md:text-[48px] leading-[1.1] font-normal text-white">
                <div>Crypto perpetual</div>
                <div>futures with leverage</div>
              </h2>
            </div>

            {/* Description */}
            <div className="mb-[32px]">
              <p className="font-sans text-[16px] md:text-[18px] leading-[1.6] text-white">
                Advanced traders can trade with leverage, open long or short positions and more—in a few taps.
              </p>
            </div>

            {/* CTA Button */}
            <div className="mb-[48px]">
              <a
                href="#"
                className="inline-block bg-[#CFF12F] text-black font-sans text-[16px] font-semibold py-[12px] px-[24px] rounded-[24px] hover:opacity-90 transition-opacity"
              >
                Learn more
              </a>
            </div>

            {/* Risk Legal Text */}
            <div className="mt-auto">
              <p className="font-sans text-[12px] md:text-[14px] leading-[1.5] text-[#999999]">
                Perpetual futures are complex derivative products, and trading involves significant risk, particularly for perpetuals referencing potentially volatile crypto assets. Leveraged trading can amplify the speed of your losses and increase the chance of losing your initial investment. Carefully consider if this product is appropriate for you in light of your experience and risk tolerance. Restrictions and eligibility requirements apply.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PerpetualFutures;
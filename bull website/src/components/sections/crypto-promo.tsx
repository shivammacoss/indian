import React from 'react';
import Image from 'next/image';

/**
 * CryptoPromo Section
 * 
 * Featured "Bull4x Crypto" section with a distinctive light-blue metallic background treatment.
 * Design specifics:
 * - Background Image: Metallic chain close-up (landing-crypto-desktop-3.jpeg)
 * - Headline: "Get more crypto for your money"
 * - Description: Trade popular crypto like BTC, ETH, and SOL at low costs.
 * - Theme: Dark (content uses white/black contrast against the image)
 */
const CryptoPromo = () => {
  return (
    <section className="relative w-full min-h-[720px] lg:h-[840px] flex items-center overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/landing-crypto-desktop-3.jpeg"
          alt="Metallic chain detail for Bull4x Crypto"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Subtle gradient overlay for text legibility, matching the 'gradientOverlay css-hw4zxe' in local styles */}
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 60%)' 
          }} 
        />
      </div>

      {/* Content Container */}
      <div className="container relative z-10">
        <div className="max-w-[480px]">
          {/* Robinhood Crypto Logo */}
          <div className="mb-8 flex items-center gap-2">
            <svg 
              viewBox="0 0 16 16" 
              width="24" 
              height="24" 
              className="text-white fill-current"
              aria-hidden="true"
            >
              <path d="M12.986 2.004c-.343-.016-.684.07-.98.24l-7.05 4.072a1.996 1.996 0 00-.73 2.727c.184.32.456.577.785.744l4.135 2.103a.5.5 0 11-.453.882L4.558 10.67a3.497 3.497 0 01-1.373-4.48c.186-.363.456-.677.786-.917l7.05-4.072c.983-.568 2.24-.23 2.809.754.218.378.312.813.27 1.246a.5.5 0 11-.994-.097c.053-.55-.35-1.04-.9-1.093a1.01 1.01 0 00-.22-.007zM3 14a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span className="text-white text-[24px] font-display">Bull4x Crypto</span>
          </div>

          {/* Headline */}
          <h1 className="text-white mb-6 leading-[1.1] tracking-[-0.02em] font-display">
            Get more crypto for your money
          </h1>

          {/* Description */}
          <div className="mb-10 max-w-[420px]">
            <p className="text-white text-[18px] leading-[1.6] opacity-90">
              Trade popular crypto like BTC, ETH, and SOL at one of the lowest costs on average. Explore 65+ crypto—all at low costs.
            </p>
          </div>

          {/* CTA Button */}
          <div>
            <a 
              href="#" 
              className="inline-flex items-center justify-center bg-white text-black px-8 py-[12px] rounded-[24px] font-medium transition-opacity hover:opacity-90"
            >
              Learn more
            </a>
          </div>
        </div>
      </div>

      {/* Bottom spacing matching 'css-h2pjqv' from structure */}
      <div className="absolute bottom-0 h-[60px] w-full" />
    </section>
  );
};

export default CryptoPromo;
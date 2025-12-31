"use client";

import React from 'react';
import Image from 'next/image';

const SecurityTrust = () => {
  return (
    <section className="relative w-full min-h-[800px] flex items-center justify-center overflow-hidden bg-[#000000]">
      {/* Background Video/Image Container */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          poster="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/Texture_1_Desktop-5.jpg"
        >
          <source
            src="https://videos.ctfassets.net/ilblxxee70tt/5RCR93puejnArBBUkpGUSb/49b64b6ca96cbb32b97d5a095b95393b/Texture_1_Desktop.webm"
            type="video/webm"
          />
        </video>
        
        {/* Subtler gradient overlay to ensure text readability */}
        <div 
          className="absolute inset-0 z-10"
          style={{
            background: 'radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)'
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-20 container mx-auto px-[60px] text-center max-w-[1440px]">
        <div className="flex flex-col items-center justify-center">
          
          {/* Spacer to push content down roughly as seen in screenshots */}
          <div className="h-[100px] md:h-[120px]" />
          
          {/* Headline */}
          <h2 className="font-display text-white text-[48px] md:text-[64px] lg:text-[72px] leading-[1.05] tracking-[-0.03em] max-w-[900px] mx-auto mb-[40px] whitespace-pre-line text-balance">
            Industry-leading&nbsp;
            security. Trusted by over 
            26 million users.
          </h2>

          {/* Call to Action */}
          <div className="mt-4">
            <a
              href="#"
              className="inline-flex items-center justify-center bg-[#CFF12F] text-black text-[16px] font-medium px-[28px] py-[14px] rounded-[32px] hover:opacity-90 transition-opacity duration-200"
            >
              Get started
            </a>
          </div>

          {/* Bottom Spacer */}
          <div className="h-[100px] md:h-[140px]" />
        </div>
      </div>

      {/* Mobile Pattern handling - Ensuring it feels consistent across viewports */}
      <style jsx global>{`
        @media (max-width: 768px) {
          h2 {
            font-size: 42px !important;
            padding: 0 20px;
          }
        }
      `}</style>
    </section>
  );
};

export default SecurityTrust;
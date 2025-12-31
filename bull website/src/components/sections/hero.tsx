import React from 'react';

/**
 * HeroSection Component
 * 
 * Bull4x hero section with a full-bleed video background,
 * high-impact serif headline, and accent green CTA button.
 * 
 * Assets used:
 * - Video: EU_Web_Landing_Hero_Desktop_Short.webm
 * - Fallback: EU_Web_Landing_Hero_Desktop_Short-1.jpg
 */
const HeroSection: React.FC = () => {
  return (
    <section className="relative w-full h-screen overflow-hidden bg-[#110E08]">
      {/* Full-bleed Background Video Container */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          poster="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/EU_Web_Landing_Hero_Desktop_Short-1.jpg"
          aria-label="One place for all your investments"
        >
          <source 
            src="https://videos.ctfassets.net/ilblxxee70tt/2s4toSMKFMvqnwyBZyS6LD/16627808bbf120f5a1264d23b1007278/EU_Web_Landing_Hero_Desktop_Short.webm" 
            type="video/webm" 
          />
        </video>
        {/* Subtle Radial Gradient Overlay for text legibility */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            background: 'radial-gradient(circle at center, rgba(17, 14, 8, 0) 0%, rgba(17, 14, 8, 0.4) 100%)' 
          }} 
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-6 text-center">
        <div className="max-w-[1000px] flex flex-col items-center">
          {/* Main Headline */}
          <h1 
            className="font-display text-white mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000"
            style={{ 
              fontSize: 'clamp(3.5rem, 8vw, 5.25rem)', 
              lineHeight: '1.1',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              textWrap: 'balance'
            }}
          >
            One place for all your investments
          </h1>

          {/* Subtext */}
          <p 
            className="text-white text-lg md:text-xl font-normal max-w-[640px] mb-10 opacity-90 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150"
            style={{ 
              lineHeight: '1.6',
              textWrap: 'balance'
            }}
          >
            Everything you need to start investing is here. From Stock Tokens to crypto—buy, sell, and manage it all in one place.
          </p>

          {/* Primary CTA Button */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <a
              href="#"
              className="inline-flex items-center justify-center bg-[#CFF12F] hover:bg-[#CFF12F]/90 active:scale-[0.98] transition-all duration-200 text-black px-8 py-3 rounded-full text-base font-medium min-w-[140px]"
              style={{
                fontFamily: 'var(--font-sans)',
              }}
            >
              Get started
            </a>
          </div>
        </div>
      </div>

      {/* Spacing alignment helper (mimicking the site's vertical structure) */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-transparent" />
    </section>
  );
};

export default HeroSection;
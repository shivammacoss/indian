"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDown, Globe } from "lucide-react";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-colors duration-300 h-[64px] flex items-center ${
        isScrolled ? "bg-[#110E08] border-b border-[#2A2620]" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-[24px] lg:px-[60px] flex items-center justify-between w-full">
        {/* Left Section: Logo & Main Nav */}
        <div className="flex items-center gap-[34px]">
          <a href="/" className="flex items-center" aria-label="Bull4x Logo">
            <Image
              src="/bull4x-logo.png"
              alt="Bull4x Logo"
              width={400}
              height={400}
              className="h-[140px] w-auto object-contain"
            />
          </a>

          <div className="hidden md:flex items-center gap-[24px]">
            <button className="flex items-center gap-[4px] text-white hover:text-accent-green transition-colors text-[16px] font-medium py-2">
              What We Offer <ChevronDown size={16} />
            </button>
            <a
              href="#"
              className="text-white hover:text-accent-green transition-colors text-[16px] font-medium py-2"
            >
              Support
            </a>
          </div>
        </div>

        {/* Right Section: Language, Log in, Sign up */}
        <div className="flex items-center gap-[12px] md:gap-[24px]">
          <button className="flex items-center gap-[6px] text-white hover:text-accent-green transition-colors text-[14px] font-medium">
            <Globe size={18} />
            <span className="hidden sm:inline">EN</span>
            <ChevronDown size={14} className="hidden sm:inline" />
          </button>

          <a
            href="#"
            className="text-white hover:text-accent-green transition-colors text-[16px] font-medium hidden sm:block"
          >
            Log in
          </a>

          <div className="flex items-center gap-[8px]">
            {/* On mobile, Log in might be a button or hidden, following typical RH UI */}
            <a
              href="#"
              className="bg-accent-green text-black px-[20px] py-[10px] rounded-[24px] text-[16px] font-bold hover:brightness-110 transition-all whitespace-nowrap"
            >
              Sign up
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 1440px;
        }
        @font-face {
          font-family: 'CapsuleSansText-Medium';
          src: local('Inter SemiBold'), local('Inter-SemiBold'), url('https://fonts.gstatic.com/s/inter/v12/UcCO19kqW-qN2n06WEpZgwfo.woff2') format('woff2');
        }
        nav {
          font-family: 'CapsuleSansText-Medium', 'Inter', sans-serif;
        }
      `}</style>
    </nav>
  );
};

export default Navigation;
import React from 'react';

/**
 * Footer component for Bull4x.
 * Features the signature lime-green background, multi-column navigation,
 * detailed legal disclaimers, and massive brand wordmark.
 */

export default function Footer() {
  const socialLinks = [
    { name: 'X', href: '#', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z' },
    { name: 'Instagram', href: '#', path: 'M10 2.182c2.545 0 2.848.01 3.854.055 1.05.048 1.62.223 2 .37a3.35 3.35 0 0 1 1.242.808c.355.356.591.731.808 1.242.147.38.322.95.37 2 .045 1.006.055 1.309.055 3.854s-.01 2.848-.055 3.854c-.048 1.05-.223 1.62-.37 2a3.35 3.35 0 0 1-.808 1.242c-.356.355-.731.591-1.242.808-.38.147-.95.322-2 .37-1.006.045-1.309.055-3.854.055s-2.848-.01-3.854-.055c-1.05-.048-1.62-.223-2-.37a3.35 3.35 0 0 1-1.242-.808 3.35 3.35 0 0 1-.808-1.242c-.147-.38-.322-.95-.37-2-.045-1.006-.055-1.309-.055-3.854s.01-2.848.055-3.854c.048-1.05.223-1.62.37-2a3.35 3.35 0 0 1 .808-1.242c.356-.355.731-.591 1.242-.808.38-.147.95-.322 2-.37 1.006-.045 1.309-.055 3.854-.055zM10 0C7.412 0 7.087.01 6.07.057c-1.015.046-1.708.208-2.314.444a5.178 5.178 0 0 0-1.87 1.218A5.178 5.178 0 0 0 .673 3.59c-.236.606-.398 1.299-.444 2.314C.01 6.913 0 7.238 0 9.826s.01 2.913.057 3.93c.046 1.015.208 1.708.444 2.314a5.178 5.178 0 0 0 1.218 1.87 5.178 5.178 0 0 0 1.87 1.218c.606.236 1.299.398 2.314.444 1.017.047 1.342.057 3.93.057s2.913-.01 3.93-.057c1.015-.046 1.708-.208 2.314-.444a5.178 5.178 0 0 0 1.87-1.218 5.178 5.178 0 0 0 1.218-1.87c.236-.606.398-1.299.444-2.314.047-1.017.057-1.342.057-3.93s-.01-2.913-.057-3.93c-.046-1.015-.208-1.708-.444-2.314a5.178 5.178 0 0 0-1.218-1.87A5.178 5.178 0 0 0 16.063.5c-.606-.236-1.299-.398-2.314-.444C12.74 0 12.413 0 9.826 0H10zM10 4.773a5.053 5.053 0 1 0 0 10.106 5.053 5.053 0 0 0 0-10.106zm0 8.324a3.27 3.27 0 1 1 0-6.541 3.27 3.27 0 0 1 0 6.541zm5.253-9.043a1.213 1.213 0 1 1-2.426 0 1.213 1.213 0 0 1 2.426 0z' },
    { name: 'Facebook', href: '#', path: 'M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z' },
    { name: 'LinkedIn', href: '#', path: 'M19 0H1C.447 0 0 .447 0 1v18c0 .553.447 1 1 1h18c.553 0 1-.447 1-1V1c0-.553-.447-1-1-1zM6.176 17.047H3.34V8.132h2.837v8.915zM4.758 6.913c-.908 0-1.644-.736-1.644-1.644 0-.909.736-1.644 1.644-1.644.908 0 1.644.735 1.644 1.644 0 .908-.736 1.644-1.644 1.644zm12.289 10.134h-2.835v-4.444c0-1.06-.02-2.424-1.477-2.424-1.478 0-1.705 1.155-1.705 2.347v4.521H8.196V8.132h2.72v1.218h.039c.379-.718 1.305-1.474 2.685-1.474 2.871 0 3.407 1.89 3.407 4.347v4.824z' },
  ];

  return (
    <footer id="navigation-footer" className="bg-[#CFF12F] text-[#000000] py-14 px-6 md:px-[60px] font-sans">
      <div className="max-w-[1440px] mx-auto">
        
        {/* Banner Section */}
        <div className="border-b border-black/10 pb-8 mb-12">
          <p className="text-[14px] leading-[1.6] md:text-[18px]">
            Another year of progress, minted. Look back at what we’ve built in 2025.{' '}
            <a href="#" className="underline font-medium hover:opacity-70 transition-opacity">
              See highlights
            </a>.
          </p>
        </div>

        {/* Desktop Layout Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Side: Navigation & Social */}
          <div className="flex flex-col">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
              {/* Product */}
              <div>
                <h4 className="font-semibold text-[14px] mb-4">Product</h4>
                <ul className="space-y-3">
                  {['Invest', 'Crypto', 'Perpetual Futures', 'Staking'].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-[14px] hover:underline whitespace-nowrap">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cryptocurrencies */}
              <div>
                <h4 className="font-semibold text-[14px] mb-4">Cryptocurrencies</h4>
                <ul className="space-y-3 text-[14px]">
                  {['Bitcoin (BTC)', 'Solana (SOL)', 'USDC (USDC)', 'Ethereum (ETH)', 'Dogecoin (DOGE)', 'Shiba Inu (SHIB)', 'PEPE (PEPE)', 'BONK (BONK)', 'Dogwifhat (WIF)', 'See more'].map((item) => (
                    <li key={item}>
                      <a href="#" className="hover:underline whitespace-nowrap">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Parent Company */}
              <div>
                <h4 className="font-semibold text-[14px] mb-4">Parent Company</h4>
                <ul className="space-y-3 text-[14px]">
                  {['About us', 'Blog', 'Partner With Us', 'Press', 'Commitments', 'Investor Relations', 'Support', 'ESG', 'Terms & Conditions'].map((item) => (
                    <li key={item}>
                      <a href="#" className="hover:underline whitespace-nowrap">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal & Regulatory */}
              <div>
                <h4 className="font-semibold text-[14px] mb-4">Legal & Regulatory</h4>
                <ul className="space-y-3 text-[14px]">
                  {['Disclosures', 'Fee Schedule', 'Privacy', 'Cookie Policy', 'Customer Agreement', 'Notice for Italian Users'].map((item) => (
                    <li key={item}>
                      <a href="#" className="hover:underline whitespace-nowrap">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Social Media */}
            <div className="mt-auto">
              <span className="text-[14px] font-medium block mb-4">Follow us on</span>
              <ul className="flex items-center gap-6">
                {socialLinks.map((social) => (
                  <li key={social.name}>
                    <a href={social.href} aria-label={social.name} className="hover:opacity-60 transition-opacity">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d={social.path} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Side: Detailed Legal Disclaimers */}
          <div className="space-y-6 text-[12px] leading-[1.6]">
            <p>
              Stock Tokens are derivative contracts between you and Bull4x. They are priced at the prices of the underlying securities without granting rights to them. Stock Tokens carry a high level of risk and are not appropriate for all investors. Investors may lose up to the full amount of their invested capital due to market conditions or the insolvency of Bull4x. Please review the{' '}
              <a href="#" className="underline font-medium">Description of the Services, Financial Instruments, and Risks</a> and the{' '}
              <a href="#" className="underline font-medium">Key Information Document</a> and fully understand all associated risks before investing.
            </p>
            <p>
              Perpetual futures are complex derivative products, and trading involves significant risk and is not appropriate for all investors, particularly for perpetuals referencing crypto assets which experience volatile price movements. Further, leveraged trading is risky as it can amplify the speed of your losses and increases the chance of you losing all of your initial investment. Please carefully consider if investing in such financial instruments is appropriate for you in light of your specific experience, risk tolerance, and financial situation. Restrictions and eligibility requirements apply.
            </p>
            <p>
              Bull4x Europe, UAB (&quot;B4X&quot; or &quot;Bull4x&quot;) (company code: 306377915) is authorized and regulated by the Bank of Lithuania (&quot;BoL&quot;) as a financial brokerage firm and a crypto-asset service provider. B4X is an affiliated entity and wholly owned subsidiary of Bull4x Markets, Inc. (&quot;Parent Company&quot;). B4X&apos;s registered address is: Vilniaus g. 33-201, LT-01402 Vilnius, Lithuania.
            </p>
            <p className="font-mono">5070830</p>
            <p>
              Bull4x Markets, Inc. © 2025 Bull4x. All rights reserved.
            </p>
          </div>
        </div>

        {/* Massive Brand Wordmark */}
        <div className="mt-20 flex justify-center overflow-hidden select-none pointer-events-none">
          <h1 className="text-[20vw] lg:text-[23.5vw] font-display font-medium leading-[0.8] -mb-[4vw] tracking-tighter">
            Bull4x
          </h1>
        </div>
      </div>
    </footer>
  );
}
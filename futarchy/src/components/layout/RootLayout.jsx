// components/layout/RootLayout.jsx
import React from "react";
import Header from "../common/Header";
import Footer from "../common/Footer";
import { fraunces, geistMono, inter } from "../../fonts";

const RootLayout = ({
  children,
  headerConfig = "landing",
  footerConfig, // kept for backward compat, Footer is now unified
  useSnapScroll = false,
  heroContent = null,
  secondaryHeader = null,
}) => {
  if (useSnapScroll) {
    return (
      <>
        {/* Mobile-only Snap Scroll Layout */}
        <div className={`${inter.className} ${fraunces.variable} ${geistMono.variable} lg:hidden h-screen overflow-y-scroll snap-y snap-mandatory`}>
          <>
            {/* Section 1: Header + Hero */}
            <section className="snap-start h-screen flex flex-col">
              <Header config={headerConfig} />
              <div className="flex-grow overflow-y-auto">
                {heroContent}
              </div>
            </section>

            {/* Section 2: Main Content */}
            <section className="snap-start h-screen flex flex-col relative">
              {secondaryHeader}
              <main className="flex-grow overflow-y-auto pt-16 flex flex-col">
                {children}
              </main>
            </section>

            {/* Section 3: Footer */}
            <section className="snap-start h-screen flex flex-col relative pt-16">
              {secondaryHeader}
              <Footer className="flex-grow" />
            </section>
          </>
        </div>
        
        {/* Desktop Layout (Original) */}
        <div className={`${inter.className} ${fraunces.variable} ${geistMono.variable} hidden lg:flex flex-col min-h-screen`}>
          <>
            <Header config={headerConfig} />
            {secondaryHeader}
            <div className="sticky top-16 z-30">
              {heroContent}
            </div>
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </>
        </div>
      </>
    );
  }

  return (
    <div className={`${inter.className} ${fraunces.variable} ${geistMono.variable} flex flex-col min-h-screen`}>
      <>
        <Header config={headerConfig} />
        {secondaryHeader}
        {/* Sticky only on lg+, where the hero collapses to a compact bar on
            scroll. On phones and tablets the full hero (~500px) would pin
            over most of the viewport, so it scrolls away with the page;
            mt-16 clears the fixed header that top-16 cleared before. */}
        {heroContent && (
          <div className="relative z-30 mt-16 lg:mt-0 lg:sticky lg:top-16">
            {heroContent}
          </div>
        )}
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </>
    </div>
  );
};

export default RootLayout;

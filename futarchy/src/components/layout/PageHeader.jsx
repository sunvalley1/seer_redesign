import React from "react";
import Image from "next/image";

const PageHeader = ({
  title,
  logoSrc,
  logoAlt,
  children,
  watermark = true,
}) => {
  return (
    <div className="relative pt-16 bg-white dark:bg-futarchyDarkGray3 border-b border-futarchyGray62 dark:border-futarchyDarkGray42">
      <div className="container mx-auto px-5">
        {watermark && (
          <div className="absolute top-1/2 right-[100px] -translate-y-1/2 pointer-events-none hidden dark:lg:block">
            <Image
              src="/assets/seer-logo.svg"
              alt="Futarchy Watermark"
              width={286}
              height={286}
              className="opacity-[0.03]"
              priority
            />
          </div>
        )}

        <div className="flex flex-col py-8 md:py-10">
          <div className="flex flex-col sm:flex-row items-start gap-5 lg:gap-6">
            {logoSrc && (
              <div className="shrink-0">
                <Image
                  src={logoSrc}
                  alt={logoAlt}
                  width={72}
                  height={72}
                  className="rounded-xl border border-futarchyGray62 dark:border-futarchyDarkGray42 w-16 h-16 lg:w-[72px] lg:h-[72px]"
                  priority
                />
              </div>
            )}
            <div className="flex flex-col flex-1 items-start text-left">
              <h2 className="font-display text-[22px] lg:text-[26px] font-medium tracking-[-0.025em] text-futarchyGray12 dark:text-white mb-3 leading-tight">
                {title}
              </h2>
              {/* Children will render additional content like descriptions, stats, etc. */}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader; 
import React from 'react';

// Centralized color configurations for different badge types
const colorConfigs = {
  emerald: 'bg-[#00c42b]/10 text-[#00c42b] hover:bg-[#00c42b]/[0.16]',
  purple: 'bg-[#9747ff]/10 text-[#9747ff] hover:bg-[#9747ff]/[0.16] dark:text-[#b98aff]',
  teal: 'bg-[#0d9488]/[0.12] text-[#0f766e] hover:bg-[#0d9488]/[0.18] dark:bg-[#2dd4bf]/[0.18] dark:text-[#2dd4bf] dark:hover:bg-[#2dd4bf]/25',
  gold: 'bg-[#ffa500]/20 text-[#e76f51] hover:bg-[#ffa500]/[0.28] dark:bg-[#fbbf24]/10 dark:text-[#fbbf24] dark:hover:bg-[#fbbf24]/[0.16]',
  blue: 'bg-[#e8f0ff] text-[#1e48c2] hover:bg-[#dbe7ff] dark:bg-[#24cdfe]/10 dark:text-[#24cdfe] dark:hover:bg-[#24cdfe]/[0.16]',
  violet: 'bg-[#f1ecfe] text-[#7c3aed] hover:bg-[#e8e0fd] dark:bg-[#7b2bff]/[0.16] dark:text-[#c7abff] dark:hover:bg-[#7b2bff]/25',
  gray: 'bg-[var(--h-bg-2,#f3f2ec)] text-[var(--h-ink-3,#4b5563)] hover:bg-[var(--h-bg-3,#eceae2)]',
  orange: 'bg-[#ff9900]/[0.12] text-[#c2410c] hover:bg-[#ff9900]/20 dark:text-[#fbbf24] dark:bg-[#fbbf24]/10 dark:hover:bg-[#fbbf24]/[0.16]',
  default: 'bg-[var(--h-bg-2,#f3f2ec)] text-[var(--h-ink-2,#1f2937)] hover:bg-[var(--h-bg-3,#eceae2)]',
};

const PlusIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block shrink-0">
        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block shrink-0 opacity-70">
        <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const MarketBadge = ({ text, colorScheme = 'default', link, onClick }) => {
  const badgeClasses = colorConfigs[colorScheme] || colorConfigs.default;
  const commonClasses = `fx-sheen inline-flex items-center justify-center gap-1.5 rounded-[8px] px-[10px] py-[5px] text-[12px] font-medium leading-[1.5] transition-colors duration-200 whitespace-nowrap`;

  // Apply a more subtle glow effect only to interactive badges
  const interactiveBadges = ['Market Summary', 'Track Progress', 'Prediction Market', 'Resolve Question', 'Resolution Question', 'Add Liquidity', 'Arbitrage Contract'];
  const isInteractive = interactiveBadges.includes(text) || link || onClick;

  const glowClass = isInteractive ? 'cursor-pointer' : '';

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${commonClasses} ${badgeClasses} cursor-pointer ${glowClass}`}
      >
        {text === 'Add Liquidity' && <PlusIcon />}
        <span className="whitespace-nowrap">{text}</span>
      </button>
    );
  }

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={`${commonClasses} ${badgeClasses} cursor-pointer ${glowClass}`}
      >
        {text === 'Add Liquidity' && <PlusIcon />}
        <span className="whitespace-nowrap">{text}</span>
        {text !== 'Add Liquidity' && <ArrowIcon />}
      </a>
    );
  }

  return (
    <span className={`${commonClasses} ${badgeClasses} ${glowClass}`}>
      <span className="whitespace-nowrap">{text}</span>
    </span>
  );
};

export default MarketBadge;
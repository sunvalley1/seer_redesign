import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectKitButton } from 'connectkit';
import { SeerLogo } from './SeerLogo';
import { ThemeToggle } from './ThemeToggle';

export const HEADER_CONFIG = {
  connectWalletLabel: 'Connect wallet',
};

function truncateAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up';

function SectionLink({
  hash,
  children,
}: {
  hash: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const to = location.pathname === '/' ? hash : `/${hash}`;

  return (
    <a
      href={to}
      className={`whitespace-nowrap rounded-md px-3.5 py-2 text-ink-3 transition-colors hover:bg-bg-2 hover:text-paper ${FOCUS}`}
    >
      {children}
    </a>
  );
}

export interface MainHeaderProps {
  readonly className?: string;
}

export const MainHeader: React.FC<MainHeaderProps> = ({ className = '' }) => {
  return (
    <header
      className={`sticky top-0 z-50 border-b border-edge bg-plaque text-paper ${className}`}
    >
      <div className="mx-auto grid h-16 w-full max-w-shell grid-cols-[1fr_auto] items-center gap-4 px-6 md:grid-cols-[1fr_auto_1fr] lg:px-10">
        <Link
          to="/"
          aria-label="Seer Opportunity Markets home"
          className={`group flex min-w-0 items-center gap-3 justify-self-start ${FOCUS}`}
        >
          <SeerLogo className="h-5 transition-colors group-hover:text-brand" />
          <span aria-hidden className="h-4 w-px bg-edge-strong" />
          <span className="hidden truncate text-sm font-medium text-ink-2 sm:inline">
            Opportunity Markets
          </span>
          <span className="rounded-full bg-bg-2 px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase leading-4 tracking-[0.08em] text-muted">
            Beta
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 text-sm font-medium md:flex"
          aria-label="Page sections"
        >
          <SectionLink hash="#pilot">The pilot</SectionLink>
          <SectionLink hash="#protocol">The protocol</SectionLink>
        </nav>

        <div className="flex items-center justify-self-end gap-2">
          <ConnectKitButton.Custom>
            {({
              isConnected,
              address,
              show,
            }: {
              isConnected: boolean;
              address?: string;
              show?: () => void;
            }) => (
              <button
                type="button"
                onClick={() => show?.()}
                className={
                  isConnected
                    ? `sb-ghost inline-flex items-center px-[18px] py-[9px] font-mono text-xs font-medium tabular-nums ${FOCUS}`
                    : `sb-cta inline-flex items-center px-[18px] py-[9px] text-sm font-semibold ${FOCUS}`
                }
              >
                {isConnected && address
                  ? truncateAddress(address)
                  : HEADER_CONFIG.connectWalletLabel}
              </button>
            )}
          </ConnectKitButton.Custom>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default MainHeader;

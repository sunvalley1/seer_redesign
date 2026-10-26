// components/common/Header.jsx
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import HeaderDropdown from "./HeaderDropdown";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useAccount, useSwitchChain, useDisconnect } from 'wagmi';
import RpcRefreshButton from './RpcRefreshButton';
import BrandLogo from './BrandLogo';

const Header = ({ config = 'landing' }) => {
  const { selectedCurrency, setSelectedCurrency, baseTokenSymbol, allowWXDAI } = useCurrency();
  const { isDarkMode } = useTheme();
  const { pathname } = useRouter();

  // Get chain info from wagmi v2
  const { chain, isConnected } = useAccount();
  const { chains, switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const isGnosis = chain?.id === 100;

  const navigationOptions = [
    {
      label: 'Connect Wallet',
      href: '#',
      isWallet: true
    },
  ];

  // Header configurations
  const headerConfigs = {
    landing: {
      button: (
        <Link
          href="/companies"
          className="sb-cta inline-flex items-center px-[18px] py-[9px] text-sm font-semibold"
        >
          Launch App
        </Link>
      )
    },
    app: {
      additionalElements: (
        <div className="hidden md:flex items-center gap-4">
        </div>
      ),
      button: (
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            // Until mounted, render size-matched placeholders: the server always
            // renders the disconnected state, so rendering the real (possibly
            // connected) markup on the first client pass breaks hydration.
            if (!ready) {
              return (
                <>
                  <div className="md:hidden h-9 w-9" aria-hidden />
                  <div className="hidden md:block h-[38px] w-36" aria-hidden />
                </>
              );
            }

            // Update navigation options based on connection state
            let currentNavigationOptions = navigationOptions.map(option => {
              if (option.isWallet && connected) {
                return {
                  ...option,
                  label: account.displayName || 'Account',
                  href: '#',
                  onClick: openAccountModal
                };
              }
              return option;
            });

            if (connected) {
              currentNavigationOptions.push({
                label: 'Disconnect',
                href: '#',
                isDisconnect: true,
                onClick: () => disconnect()
              });
            }

            return (
              <>
                <div className="md:hidden">
                  <HeaderDropdown
                    options={currentNavigationOptions}
                    onWalletConnectClick={() => {
                      if (connected && openAccountModal) {
                        openAccountModal();
                      } else if (openConnectModal) {
                        openConnectModal();
                      }
                    }}
                    chain={chain}
                    mounted={ready}
                  />
                </div>
                <div className="hidden md:block">
                  <div>
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="sb-cta inline-flex items-center px-[18px] py-[9px] text-sm font-semibold"
                          >
                            Connect Wallet
                          </button>
                        );
                      }
                      return <ConnectButton />;
                    })()}
                  </div>
                </div>
              </>
            );
          }}
        </ConnectButton.Custom>
      ),
      className: "bg-white dark:bg-futarchyDarkGray3"
    }
  };

  const currentConfig = headerConfigs[config] || headerConfigs['app'];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${currentConfig.className || 'bg-white dark:bg-futarchyDarkGray3'}`}>
      <div className="h-16 border-b border-futarchyGray62 dark:border-futarchyDarkGray42">
        <div className="container relative mx-auto px-5 h-full flex items-center justify-between">
          <div className="flex items-center gap-14">
            {/* Logo Section */}
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer text-futarchyGray12 dark:text-white"
            >
              <BrandLogo className="transition-opacity group-hover:opacity-70" />
            </Link>

            {/* Additional Elements (e.g., Home button for proposals) */}
            {currentConfig.additionalElements}
          </div>

          {config !== 'landing' && (
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium absolute left-1/2 -translate-x-1/2">
              {[
                { href: '/', label: 'Markets', active: pathname === '/' || pathname.startsWith('/companies') || pathname.startsWith('/markets/[') },
                { href: '/markets/new', label: 'Create Market', active: pathname.startsWith('/markets/new') },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={`relative whitespace-nowrap rounded-md px-3.5 py-2 transition-colors hover:bg-futarchyGray3 dark:hover:bg-white/5 ${item.active
                    ? "text-futarchyGray12 dark:text-white after:absolute after:inset-x-3.5 after:-bottom-px after:h-0.5 after:rounded-t-[2px] after:bg-futarchyViolet9 after:content-['']"
                    : 'text-futarchyGray11 hover:text-futarchyGray12 dark:text-futarchyGray112 dark:hover:text-white'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side buttons */}
          <div className="flex items-center gap-2">
            {/* Chain Selector Button - Mobile */}
            {config !== 'landing' && (
              <div className="md:hidden">
                <ConnectButton.Custom>
                  {({ chain, openChainModal, mounted }) => {
                    if (!mounted) {
                      return <div aria-hidden />;
                    }
                    return (
                      <div>
                        {chain && openChainModal && (
                          <button
                            onClick={openChainModal}
                            className="h-9 w-9 rounded-full bg-futarchyGray3 hover:bg-futarchyGray4 dark:bg-white/10 dark:hover:bg-white/15 transition-colors flex items-center justify-center"
                            aria-label="Switch network"
                          >
                            {chain.hasIcon && chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                className="w-5 h-5"
                              />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            )}

            {/* RPC Refresh Button - Desktop */}
            {config !== 'landing' && chain && (
              <div className="hidden md:block">
                <RpcRefreshButton
                  chain={chain}
                  isDarkMode={isDarkMode}
                  showLabel={false}
                  className="h-9 w-9 justify-center rounded-full bg-futarchyGray3 hover:bg-futarchyGray4 text-futarchyGray11 hover:text-futarchyGray12 dark:bg-white/10 dark:hover:bg-white/15 dark:text-futarchyGray112 dark:hover:text-white"
                />
              </div>
            )}

            {/* Currency selector - show on Gnosis Chain (or assume Gnosis if no chain detected) */}
            {config !== 'landing' && (!chain || isGnosis) && allowWXDAI && baseTokenSymbol && (
              <div className="hidden md:flex items-center gap-1 p-1 text-[13px] font-medium rounded-full bg-futarchyGray3 dark:bg-white/10">
                {/* Base token from config (e.g., SDAI, USDS, etc.) */}
                <button
                  onClick={() => setSelectedCurrency(baseTokenSymbol)}
                  className={`py-1 px-3 rounded-full transition-colors ${selectedCurrency === baseTokenSymbol
                    ? 'bg-white text-futarchyGray12 shadow-sm dark:bg-futarchyDarkGray3 dark:text-white'
                    : 'text-futarchyGray11 hover:text-futarchyGray12 dark:text-futarchyGray112 dark:hover:text-white'
                    }`}
                >
                  {baseTokenSymbol}
                </button>
                {/* WXDAI option - only on Gnosis Chain */}
                {allowWXDAI && (
                  <button
                    onClick={() => setSelectedCurrency('WXDAI')}
                    className={`py-1 px-3 rounded-full transition-colors ${selectedCurrency === 'WXDAI'
                      ? 'bg-white text-futarchyGray12 shadow-sm dark:bg-futarchyDarkGray3 dark:text-white'
                      : 'text-futarchyGray11 hover:text-futarchyGray12 dark:text-futarchyGray112 dark:hover:text-white'
                      }`}
                  >
                    WXDAI
                  </button>
                )}
              </div>
            )}
            {currentConfig.button}

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

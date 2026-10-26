import * as React from 'react';
import { Link } from 'react-router-dom';
import MainHeader from '../components/MainHeader';
import Footer from '../components/Footer';
import { DEFAULT_MARKET_CHAIN_ID } from '../config/market';
import { isFinalized, useMarketList } from '../hooks/useMarketList';
import { MarketList } from '../components/MarketList';

const NAMING_MARKET_ID = '0x8b3C7f3f09f6A85353926D8ee0f12decc1C9A5e8';

const PROCESS_STEPS = [
  {
    label: 'Call for entries become submissions',
    emphasis: false,
    glow: false,
  },
  { label: 'Traders set the odds of selection', emphasis: false, glow: false },
  { label: 'Price becomes a triage tool', emphasis: true, glow: false },
  { label: 'Sponsor makes final decision', emphasis: false, glow: false },
  {
    label: 'Traders earn P&L based on final decision',
    emphasis: false,
    glow: true,
  },
] as const;

const PROTOCOL_CARDS = [
  { kicker: 'Today', body: 'Seer One operates it' },
  { kicker: 'Next', body: 'Anyone launches' },
  { kicker: 'Any decision', body: 'One shared layer' },
] as const;

function liveCountLabel(count: number): string {
  if (count === 0) return 'No markets live.';
  if (count === 1) return 'One market live.';
  if (count === 2) return 'Two markets live.';
  return `${count} markets live.`;
}

export const Home: React.FC = () => {
  const { markets, isLoading, isError, isFetching, refetch } =
    useMarketList();
  const liveMarkets = markets.filter((m) => !isFinalized(m));
  const archivedCount = markets.length - liveMarkets.length;

  const namingHref = `/markets/${DEFAULT_MARKET_CHAIN_ID}/${NAMING_MARKET_ID}`;

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-wall">
      <MainHeader />
      <main className="mx-auto flex w-full min-w-0 max-w-shell flex-1 flex-col px-6 pb-16 lg:px-10">
        {/* Hero */}
        <section className="home-hero" aria-label="Opportunity Markets">
          <div className="home-hero-inner mx-auto flex w-full max-w-[68rem] flex-col items-center text-center">
            <h1 className="hero-entrance-lead max-w-4xl font-display text-[clamp(1.875rem,3.6vw,2.5rem)] font-medium leading-[1.12] tracking-[-0.03em] text-paper">
              With AI, the cost of reviewing work is{' '}
              <span className="text-up">
                more than the time it takes to do it
              </span>
            </h1>
            <p className="hero-entrance-lead mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-3 sm:text-base sm:mt-7">
              Opportunity Markets turn any selection process into a market. Traders
              put money behind the submission they think will be selected, the
              odds move, and sponsors prioritize review on only top rated
              submissions.
            </p>

            <ol
              className="hero-step-rail mt-8 w-full sm:mt-10"
              aria-label="How opportunity markets work"
            >
              {PROCESS_STEPS.map((step, i) => (
                <React.Fragment key={step.label}>
                  {i > 0 && (
                    <li className="hero-step-arrow" aria-hidden>
                      →
                    </li>
                  )}
                  <li
                    className={
                      step.glow
                        ? 'hero-step-chip hero-step-chip--glow'
                        : step.emphasis
                          ? 'hero-step-chip hero-step-chip--emphasis'
                          : 'hero-step-chip'
                    }
                    style={{ '--beat-i': i } as React.CSSProperties}
                  >
                    {step.label}
                  </li>
                </React.Fragment>
              ))}
            </ol>

            <div className="hero-entrance-lead mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
              <Link
                to={namingHref}
                className="sb-cta inline-flex items-center px-[18px] py-[9px] text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
              >
                Name Seer&apos;s AI Job Board
              </Link>
              <a
                href="#pilot"
                className="sb-ghost inline-flex items-center px-[18px] py-[9px] text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
              >
                Where this goes
              </a>
            </div>
          </div>
        </section>

        {/* The pilot */}
        <section
          id="pilot"
          className="scroll-mt-24 border-t border-edge pt-14 sm:pt-20"
          aria-labelledby="pilot-heading"
          aria-busy={isLoading || isFetching}
        >
          <div className="opportunities-call">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand">
              The pilot
            </p>
            <h2
              id="pilot-heading"
              className="mt-3 font-display text-[26px] font-medium leading-tight tracking-[-0.025em] text-paper"
            >
              {!isLoading && !isError
                ? liveCountLabel(liveMarkets.length)
                : 'Markets live.'}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-3">
              Seer is crowdsourcing the name of its AI job board. Past markets,
              like the rebrand and Devcon merch, are in the archive.
            </p>
          </div>

          <MarketList
            markets={liveMarkets}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            emptyText="No live opportunities right now."
          />

          {!isLoading && !isError && archivedCount > 0 && (
            <Link
              to="/archive"
              className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium text-muted transition-colors hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
            >
              View archived markets ({archivedCount})
              <span aria-hidden>→</span>
            </Link>
          )}
        </section>
        {/* The protocol */}
        <section
          id="protocol"
          className="scroll-mt-24 mt-14 border-t border-edge pt-14 sm:mt-20 sm:pt-20"
          aria-labelledby="protocol-heading"
        >
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand">
            The protocol
          </p>
          <h2
            id="protocol-heading"
            className="mt-3 font-display text-[26px] font-medium leading-tight tracking-[-0.025em] text-paper"
          >
            Closed beta today. Permissionless tomorrow.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-3">
            Seer has run opportunity markets for its rebrand and Devcon merch,
            and is now naming its AI job board. Any
            team crowdsourcing solutions and wanting to pick from only among the
            best should directly launch an opportunity market.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {PROTOCOL_CARDS.map((card) => (
              <li
                key={card.kicker}
                className="lot-panel flex flex-col gap-2 px-5 py-5"
              >
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand">
                  {card.kicker}
                </span>
                <span className="font-display text-lg font-semibold tracking-[-0.025em] text-paper">
                  {card.body}
                </span>
              </li>
            ))}
          </ul>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default Home;

import * as React from 'react';
import type { Token } from '@seer-pm/sdk';

export interface TokensDropdownProps {
  readonly options: readonly Token[];
  readonly value: Token;
  readonly onSelect: (value: Token) => void;
  /** `rail` = narrow token rail beside an input; `block` = full-width picker; `pill` = token chip inside an amount field */
  readonly layout?: 'rail' | 'block' | 'pill';
}

/** Past this many options the list gets a search box. */
const SEARCH_THRESHOLD = 20;

function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function ChevronDown({ open }: { readonly open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={`h-3 w-3 flex-shrink-0 text-muted transition-transform ${
        open ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

export function TokensDropdown({
  options,
  value,
  onSelect,
  layout = 'rail',
}: TokensDropdownProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const searchable = options.length > SEARCH_THRESHOLD;
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter((t) => t.symbol.toLowerCase().includes(needle))
    : options;
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const selected = options.find((t) =>
    addressesEqual(t.address, value.address)
  );
  const label = selected?.symbol ?? value.symbol;
  const isBlock = layout === 'block';
  const isPill = layout === 'pill';

  if (options.length <= 1) {
    if (isPill) {
      return (
        <span className="io-token" title={label}>
          <span className="truncate">{label}</span>
        </span>
      );
    }
    if (isBlock) {
      return (
        <div className="flex w-full items-center rounded-panel border border-edge bg-wall px-4 py-3">
          <span className="truncate text-sm font-semibold uppercase tracking-[0.08em] text-paper">
            {label}
          </span>
        </div>
      );
    }
    return (
      <div className="flex h-full w-[108px] cursor-default items-center rounded-r-panel border-l border-edge bg-wall/60 px-3">
        <span className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-paper">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${isBlock ? 'w-full' : isPill ? 'min-w-0 flex-shrink-0' : 'h-full w-[108px]'}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={label}
        onClick={() => setOpen((o) => !o)}
        className={
          isPill
            ? 'io-token focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up'
            : isBlock
            ? 'flex w-full cursor-pointer items-center justify-between gap-2 rounded-panel border border-edge bg-wall px-4 py-3 transition-colors hover:border-paper/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-up'
            : 'flex h-full w-full cursor-pointer items-center justify-between gap-1.5 rounded-r-panel border-l border-edge bg-wall/60 px-3 py-3 transition-colors hover:bg-wall focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-up'
        }
      >
        {isPill ? (
          <span className="min-w-0 truncate">{label}</span>
        ) : (
          <span
            className={`min-w-0 truncate font-semibold uppercase tracking-[0.08em] text-paper ${
              isBlock ? 'text-sm' : 'text-xs'
            }`}
          >
            {label}
          </span>
        )}
        <ChevronDown open={open} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            aria-hidden
            onClick={close}
          />
          <div
            role="listbox"
            className={`absolute top-full z-30 mt-1 ${searchable ? 'max-h-80' : 'max-h-60'} overflow-y-auto overflow-x-hidden rounded-panel border border-edge bg-plaque py-1 shadow-panel ${
              isBlock ? 'left-0 right-0' : isPill ? 'right-0 w-64 max-w-[80vw]' : 'right-0 min-w-[12rem]'
            }`}
          >
            {searchable ? (
              <div className="sticky top-0 z-10 bg-plaque px-2 pb-1 pt-1">
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${options.length}`}
                  aria-label="Search options"
                  className="w-full rounded-control border border-edge bg-wall px-3 py-2 text-xs text-paper caret-up placeholder:text-muted focus:border-up focus:outline-none"
                />
              </div>
            ) : null}
            {searchable && filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No matches</p>
            ) : null}
            {filtered.map((token) => {
              const isSelected = addressesEqual(token.address, value.address);
              return (
                <button
                  key={token.address}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(token);
                    close();
                  }}
                  className={`w-full px-3 py-2 text-left font-mono text-[11.5px] font-semibold uppercase tracking-[0.02em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-up ${
                    isSelected
                      ? 'bg-up/10 text-up'
                      : 'text-muted hover:bg-wall hover:text-paper'
                  }`}
                >
                  {token.symbol}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default TokensDropdown;

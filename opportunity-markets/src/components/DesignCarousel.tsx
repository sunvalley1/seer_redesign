import * as React from 'react';
import { Link } from 'react-router-dom';
import type { Market } from '@seer-pm/sdk';
import {
  getMarketCarouselSlides,
  marketPath,
  type CarouselSlide,
} from '../config/submissions';
import { imageNeedsLightBackground } from '../utils/imageNeedsLightBackground';

export type DesignCarouselProps = {
  readonly market: Market;
  readonly variant: 'home' | 'detail';
  /** Nest inside a lot panel (home) without looking like a separate section. */
  readonly embedded?: boolean;
  /** On market detail: select outcome instead of navigating. */
  readonly onSelectOutcome?: (outcomeIndex: number) => void;
  readonly selectedOutcomeIndex?: number;
  readonly className?: string;
};

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 3.5L5.5 8 10 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3.5L10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SlideImage({
  url,
  alt,
  lightBg,
  onLightBgChange,
}: {
  readonly url: string;
  readonly alt: string;
  readonly lightBg?: 'force' | 'forbid';
  readonly onLightBgChange: (needsLight: boolean) => void;
}) {
  const [failed, setFailed] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const resolveLightBg = React.useCallback(
    (img: HTMLImageElement) => {
      if (lightBg === 'force') {
        onLightBgChange(true);
        return;
      }
      if (lightBg === 'forbid') {
        onLightBgChange(false);
        return;
      }
      onLightBgChange(imageNeedsLightBackground(img));
    },
    [lightBg, onLightBgChange]
  );

  React.useEffect(() => {
    setFailed(false);
    onLightBgChange(lightBg === 'force');
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      resolveLightBg(img);
    }
  }, [url, lightBg, onLightBgChange, resolveLightBg]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center bg-wall px-4 text-center text-sm text-muted">
        Could not load image
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={url}
      alt={alt}
      crossOrigin="anonymous"
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover object-center"
      onLoad={(event) => resolveLightBg(event.currentTarget)}
      onError={() => {
        setFailed(true);
        onLightBgChange(false);
      }}
    />
  );
}

function SlideFrame({ slide }: { readonly slide: CarouselSlide }) {
  const [needsLightBg, setNeedsLightBg] = React.useState(
    slide.lightBg === 'force'
  );

  return (
    <div
      className={
        needsLightBg
          ? 'h-[300px] overflow-hidden bg-white'
          : 'h-[300px] overflow-hidden bg-wall'
      }
    >
      <SlideImage
        url={slide.imageUrl}
        alt={`${slide.label}, ${slide.imageName}`}
        lightBg={slide.lightBg}
        onLightBgChange={setNeedsLightBg}
      />
    </div>
  );
}

function SlideSurface({
  slide,
  variant,
  selected,
  onSelectOutcome,
  children,
}: {
  readonly slide: CarouselSlide;
  readonly variant: 'home' | 'detail';
  readonly selected: boolean;
  readonly onSelectOutcome?: (outcomeIndex: number) => void;
  readonly children: React.ReactNode;
}) {
  const shellClass = selected
    ? 'group/slide flex h-full w-full flex-col overflow-hidden rounded-panel border border-up/40 bg-wall shadow-lot transition-[border-color] hover:border-up/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up'
    : 'group/slide flex h-full w-full flex-col overflow-hidden rounded-panel border border-edge bg-wall transition-[border-color] hover:border-up/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up';

  if (variant === 'detail' && onSelectOutcome) {
    return (
      <button
        type="button"
        onClick={() => onSelectOutcome(slide.outcomeIndex)}
        aria-pressed={selected}
        aria-label={`Select outcome ${slide.label}`}
        className={`${shellClass} text-left`}
      >
        {children}
      </button>
    );
  }

  return (
    <Link
      to={marketPath(slide.chainId, slide.marketId, slide.outcomeIndex)}
      aria-label={`Open ${slide.label} on this market`}
      className={shellClass}
    >
      {children}
    </Link>
  );
}

export function DesignCarousel({
  market,
  variant,
  embedded = false,
  onSelectOutcome,
  selectedOutcomeIndex,
  className = '',
}: DesignCarouselProps) {
  const slides = React.useMemo(
    () => getMarketCarouselSlides(market),
    [market]
  );

  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  const updateEdges = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  React.useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateEdges();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => updateEdges());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [slides.length, updateEdges]);

  const scrollByPage = React.useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 240);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);

  if (slides.length === 0) return null;

  const headingId = `designs-${market.chainId}-${market.id}`;

  return (
    <section
      className={className}
      aria-labelledby={headingId}
      aria-roledescription="carousel"
    >
      <div
        className={
          embedded
            ? 'mb-2.5 flex items-baseline justify-between gap-3'
            : 'mb-3 flex items-end justify-between gap-3'
        }
      >
        <h2
          id={headingId}
          className={
            embedded
              ? 'font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted'
              : 'font-display text-base font-semibold tracking-[-0.02em] text-paper sm:text-lg'
          }
        >
          Designs
        </h2>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
          {slides.length} {slides.length === 1 ? 'image' : 'images'}
        </p>
      </div>

      <div className="relative min-w-0">
        <ul
          ref={scrollerRef}
          className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
          aria-label="Design submissions"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              scrollByPage(-1);
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              scrollByPage(1);
            }
          }}
        >
          {slides.map((slide) => {
            const selected =
              variant === 'detail' &&
              selectedOutcomeIndex === slide.outcomeIndex;

            return (
              <li
                key={slide.key}
                className="w-[min(78vw,18rem)] shrink-0 snap-start sm:w-[16.5rem]"
              >
                <SlideSurface
                  slide={slide}
                  variant={variant}
                  selected={Boolean(selected)}
                  onSelectOutcome={onSelectOutcome}
                >
                  <SlideFrame slide={slide} />
                  <div className="border-t border-edge px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-paper group-hover/slide:text-up">
                      {slide.label}
                    </p>
                  </div>
                </SlideSurface>
              </li>
            );
          })}
        </ul>

        {canPrev ? (
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            className="absolute left-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control border border-edge bg-plaque/95 text-paper shadow-lot transition-colors hover:border-up/40 hover:text-up focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up sm:inline-flex"
            aria-label="Previous designs"
          >
            <ChevronLeft />
          </button>
        ) : null}
        {canNext ? (
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            className="absolute right-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control border border-edge bg-plaque/95 text-paper shadow-lot transition-colors hover:border-up/40 hover:text-up focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up sm:inline-flex"
            aria-label="Next designs"
          >
            <ChevronRight />
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default DesignCarousel;

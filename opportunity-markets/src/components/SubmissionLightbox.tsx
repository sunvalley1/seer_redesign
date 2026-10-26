import * as React from 'react';
import { createPortal } from 'react-dom';
import { imageNeedsLightBackground } from '../utils/imageNeedsLightBackground';

export type SubmissionLightboxProps = {
  readonly open: boolean;
  readonly title: string;
  readonly images: readonly { name: string; url: string }[];
  readonly onClose: () => void;
};

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M4.5 4.5l9 9M13.5 4.5l-9 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PortfolioImage({
  url,
  alt,
}: {
  readonly url: string;
  readonly alt: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const [retryKey, setRetryKey] = React.useState(0);
  const [needsLightBg, setNeedsLightBg] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const resolveLightBg = React.useCallback((img: HTMLImageElement) => {
    setNeedsLightBg(imageNeedsLightBackground(img));
  }, []);

  React.useEffect(() => {
    setFailed(false);
    setNeedsLightBg(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      resolveLightBg(img);
    }
  }, [url, retryKey, resolveLightBg]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <p className="text-base text-paper">Could not load this image.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setRetryKey((k) => k + 1);
          }}
          className="sb-cta px-5 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        needsLightBg
          ? 'overflow-hidden rounded-panel bg-white p-4 sm:p-6'
          : undefined
      }
    >
      <img
        key={`${url}-${retryKey}`}
        ref={imgRef}
        src={url}
        alt={alt}
        crossOrigin="anonymous"
        className="mx-auto h-auto w-full max-w-full"
        onLoad={(event) => resolveLightBg(event.currentTarget)}
        onError={() => {
          setFailed(true);
          setNeedsLightBg(false);
        }}
      />
    </div>
  );
}

export function SubmissionLightbox({
  open,
  title,
  images,
  onClose,
}: SubmissionLightboxProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const count = images.length;

  React.useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    scrollRef.current?.scrollTo(0, 0);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open || count === 0) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-wall/92 p-4 sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} images`}
        className="lot-panel relative flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden shadow-panel"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-edge px-5 py-4">
          <h2 className="min-w-0 truncate font-display text-lg font-semibold text-paper">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-paper/15 text-paper transition-colors hover:border-up/40 hover:text-up focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
            aria-label="Close images"
          >
            <CloseIcon />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-wall"
        >
          <ul className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
            {images.map((image, i) => (
              <li key={image.url} className="list-none">
                <PortfolioImage
                  url={image.url}
                  alt={`${title}, image ${i + 1} of ${count}`}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SubmissionLightbox;

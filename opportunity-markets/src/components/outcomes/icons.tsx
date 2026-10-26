interface IconProps {
  readonly size?: number;
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function ArrowUpRightIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function DropletIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <path d="M12 3.2 6.6 9.2a7.2 7.2 0 1 0 10.8 0L12 3.2z" />
    </svg>
  );
}

export function LayersIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <path d="M12 3 2 8l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12.5l10 5 10-5" />
    </svg>
  );
}

export function BranchIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <circle cx="6" cy="4" r="2" />
      <circle cx="6" cy="20" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 6v12" />
      <path d="M18 10a6 6 0 0 1-6 6H8" />
    </svg>
  );
}

export function ImageIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  );
}

export function DocumentIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function GlobeIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function CopyIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function InfoCircleIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6h.01" />
    </svg>
  );
}

export function CheckIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CloseIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 7C0 3.13438 3.13438 0 7 0C10.8656 0 14 3.13438 14 7C14 10.8656 10.8656 14 7 14C3.13438 14 0 10.8656 0 7ZM1.1875 7C1.1875 10.2094 3.79063 12.8125 7 12.8125C10.2094 12.8125 12.8125 10.2094 12.8125 7C12.8125 3.79063 10.2094 1.1875 7 1.1875C3.79063 1.1875 1.1875 3.79063 1.1875 7ZM9.18902 4.51514H9.92183C10.0234 4.51514 10.0828 4.63076 10.0218 4.71357L6.7312 9.27607C6.68521 9.34027 6.62458 9.39257 6.55434 9.42866C6.4841 9.46474 6.40627 9.48356 6.3273 9.48356C6.24833 9.48356 6.1705 9.46474 6.10026 9.42866C6.03001 9.39257 5.96938 9.34027 5.92339 9.27607L3.97652 6.57607C3.91714 6.49326 3.97652 6.37764 4.07808 6.37764H4.81089C4.97183 6.37764 5.12183 6.45576 5.21558 6.58545L6.32808 8.1292L8.78433 4.72295C8.87808 4.5917 9.02964 4.51514 9.18902 4.51514Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function QuestionIcon({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...strokeProps}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.9" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}

export function InvalidOutcomeIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={(size * 83) / 70} viewBox="0 0 70 83" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.936 64.967a3.525 3.525 0 0 0 1.038 3.378l3.827 3.554 3.742 3.475v1.61H6.198V6.016h31.87v13.328c0 2.156 1.776 3.89 3.984 3.89h15.492v42.49L54.8 63.175a3.546 3.546 0 0 0-3.45-.792l-5.298-4.92a19.331 19.331 0 0 0 5.294-13.314c0-10.727-8.72-19.426-19.476-19.426-10.755 0-19.476 8.699-19.476 19.426 0 10.727 8.72 19.425 19.476 19.425 4.31 0 8.294-1.396 11.52-3.761.025.026.05.051.078.076l5.468 5.078Zm14.804 6.51V21.382a7.663 7.663 0 0 0-2.34-5.495L47.473 2.286A8.065 8.065 0 0 0 41.846 0H7.968C3.568 0 0 3.485 0 7.781V75.22C0 79.515 3.569 83 7.968 83h47.805a8.018 8.018 0 0 0 6.48-3.253l1.793 1.665a3.548 3.548 0 0 0 5.041-.218 3.525 3.525 0 0 0-.215-4.952l-5.132-4.765ZM42.495 18.984V4.882l14.402 14.102H42.494ZM31.87 60.279c-8.93 0-16.172-7.224-16.172-16.13 0-8.906 7.243-16.13 16.172-16.13 8.93 0 16.172 7.224 16.172 16.13 0 8.906-7.242 16.13-16.172 16.13Zm7.539-22.987a.348.348 0 0 0-.348-.347l-2.87.013-4.32 5.138-4.317-5.134-2.874-.013a.346.346 0 0 0-.265.573l5.656 6.72-5.656 6.717a.348.348 0 0 0 .265.572l2.873-.012 4.317-5.139 4.317 5.134 2.87.013a.346.346 0 0 0 .265-.572l-5.647-6.717 5.656-6.72a.347.347 0 0 0 .078-.226Z"
        fill="currentColor"
      />
    </svg>
  );
}

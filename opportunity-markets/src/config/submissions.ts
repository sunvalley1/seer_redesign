import type { Market } from '@seer-pm/sdk';
import ipfsManifest from '../../submissions/ipfs-manifest.json';
import { getMarketOverride, type MarketOverride } from './market';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const PDF_EXT = /\.pdf$/i;

const DEFAULT_IPFS_GATEWAY = 'https://cdn.kleros.link';

export type ManifestFile = {
  name: string;
  localPath: string;
  ipfsPath: string;
};

export type SubmissionAssets = {
  submissionId: string;
  images: { name: string; url: string }[];
  pdfUrl?: string;
  portfolioUrl?: string;
};

export type CarouselSlide = {
  key: string;
  marketId: string;
  chainId: number;
  outcomeIndex: number;
  label: string;
  submissionId: string;
  imageName: string;
  imageUrl: string;
  /** Manual light-bg override; undefined = auto-detect. */
  lightBg?: 'force' | 'forbid';
};

type Manifest = {
  markets: Record<string, Record<string, ManifestFile[]>>;
};

const manifest = ipfsManifest as Manifest;

function ipfsGatewayBase(): string {
  const fromEnv = import.meta.env.VITE_IPFS_GATEWAY?.trim();
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_IPFS_GATEWAY;
  return base.replace(/\/$/, '');
}

export function ipfsUrl(ipfsPath: string): string {
  const path = ipfsPath.startsWith('/') ? ipfsPath : `/${ipfsPath}`;
  return `${ipfsGatewayBase()}${path}`;
}

export function carouselImageKey(submissionId: string, fileName: string): string {
  return `${submissionId}/${fileName}`;
}

function findSubmissionFiles(
  marketKey: string,
  submissionId: string
): ManifestFile[] | undefined {
  return manifest.markets[marketKey]?.[submissionId];
}

function resolveSubmissionId(
  marketKey: string,
  outcomeTitle: string,
  explicit?: Record<string, string>
): string | undefined {
  const title = outcomeTitle.trim();

  const mapped = explicit?.[title] ?? explicit?.[outcomeTitle];
  if (mapped && findSubmissionFiles(marketKey, mapped)) {
    return mapped;
  }

  const submissions = manifest.markets[marketKey];
  if (!submissions) return undefined;

  if (submissions[title]) return title;
  if (submissions[outcomeTitle]) return outcomeTitle;

  const lower = title.toLowerCase();
  const ci = Object.keys(submissions).find((id) => id.toLowerCase() === lower);
  return ci;
}

function isCarouselImageAllowed(
  override: MarketOverride | undefined,
  submissionId: string,
  fileName: string
): boolean {
  const key = carouselImageKey(submissionId, fileName);
  const include = override?.carouselInclude;
  if (include && include.length > 0) {
    return include.includes(key);
  }
  const exclude = override?.carouselExclude;
  if (exclude && exclude.length > 0) {
    return !exclude.includes(key);
  }
  return true;
}

function resolveCarouselLightBg(
  override: MarketOverride | undefined,
  submissionId: string,
  fileName: string
): 'force' | 'forbid' | undefined {
  const key = carouselImageKey(submissionId, fileName);
  if (override?.carouselNoLightBg?.includes(key)) return 'forbid';
  if (override?.carouselLightBg?.includes(key)) return 'force';
  return undefined;
}

export function getOutcomeSubmissionAssets(
  marketId: string,
  outcomeTitle: string
): SubmissionAssets | undefined {
  const override = getMarketOverride(marketId);
  const marketKey = override?.submissionsMarket;
  if (!marketKey) return undefined;

  const portfolioUrl =
    override.portfolios?.[outcomeTitle.trim()] ??
    override.portfolios?.[outcomeTitle];

  const submissionId = resolveSubmissionId(
    marketKey,
    outcomeTitle,
    override.submissions
  );

  if (!submissionId) {
    if (!portfolioUrl) return undefined;
    return { submissionId: '', images: [], portfolioUrl };
  }

  const files = findSubmissionFiles(marketKey, submissionId) ?? [];

  const images = files
    .filter((f) => IMAGE_EXT.test(f.name))
    .map((f) => ({ name: f.name, url: ipfsUrl(f.ipfsPath) }));

  const pdf = files.find((f) => PDF_EXT.test(f.name));

  if (images.length === 0 && !pdf && !portfolioUrl) return undefined;

  return {
    submissionId,
    images,
    pdfUrl: pdf ? ipfsUrl(pdf.ipfsPath) : undefined,
    portfolioUrl,
  };
}

export function getMarketCarouselSlides(market: Market): CarouselSlide[] {
  const override = getMarketOverride(market.id);
  const marketKey = override?.submissionsMarket;
  if (!marketKey) return [];

  const wrapped = market.wrappedTokens ?? [];
  const rawOutcomes = market.outcomes ?? [];
  const slides: CarouselSlide[] = [];

  for (let outcomeIndex = 0; outcomeIndex < wrapped.length; outcomeIndex += 1) {
    const label =
      typeof rawOutcomes[outcomeIndex] === 'string'
        ? (rawOutcomes[outcomeIndex] as string)
        : `Outcome ${outcomeIndex + 1}`;

    const submissionId = resolveSubmissionId(
      marketKey,
      label,
      override?.submissions
    );
    if (!submissionId) continue;

    const files = findSubmissionFiles(marketKey, submissionId);
    if (!files?.length) continue;

    for (const file of files) {
      if (!IMAGE_EXT.test(file.name)) continue;
      if (!isCarouselImageAllowed(override, submissionId, file.name)) continue;

      slides.push({
        key: `${market.id}-${outcomeIndex}-${file.name}`,
        marketId: market.id,
        chainId: market.chainId,
        outcomeIndex,
        label,
        submissionId,
        imageName: file.name,
        imageUrl: ipfsUrl(file.ipfsPath),
        lightBg: resolveCarouselLightBg(override, submissionId, file.name),
      });
    }
  }

  return slides;
}

export function marketPath(
  chainId: number | string,
  marketId: string,
  outcomeIndex?: number
): string {
  const base = `/markets/${chainId}/${marketId}`;
  if (outcomeIndex === undefined) return base;
  return `${base}?outcome=${outcomeIndex}`;
}

export function parseOutcomeSearchParam(
  value: string | null,
  outcomeCount: number
): number {
  if (outcomeCount <= 0) return 0;
  if (value == null || value === '') return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), outcomeCount - 1);
}

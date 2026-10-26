import { CHAIN_IDS } from '@seer-pm/sdk';
import type { Address } from 'viem';

export const DEFAULT_MARKET_CHAIN_ID = CHAIN_IDS.gnosis;

/**
 * One level of a chained "Other" market (see chained-other-markets guide).
 * Level i+1 is a conditional market whose parent outcome is level i's `otherIndex`.
 */
export type ChainedMarketLevel = {
  marketId: Address;
  /** Index of the "Other" outcome that feeds the next level; null on the last level. */
  otherIndex: number | null;
};

export type MarketOverride = {
  title: string;
  description?: string;
  /** Key under `submissions/ipfs-manifest.json` → `markets` */
  submissionsMarket?: string;
  /**
   * Exact outcome title → submission folder id in the manifest.
   * Also matches when the outcome title equals the folder id.
   */
  submissions?: Record<string, string>;
  /** Exact outcome title → public portfolio / website URL. */
  portfolios?: Record<string, string>;
  /**
   * Carousel curation keys: `${submissionId}/${fileName}`.
   * When `carouselInclude` is non-empty, only those images appear.
   * Otherwise all images appear except `carouselExclude`.
   */
  carouselInclude?: string[];
  carouselExclude?: string[];
  /** Force white slide frame (dark logos the detector misses). */
  carouselLightBg?: string[];
  /** Never apply white slide frame (false positives). */
  carouselNoLightBg?: string[];
  /**
   * Ordered levels (root first) when the opportunity spans several chained markets.
   * The UI shows them as a single flat list; the root market id is the config key.
   */
  chainedMarkets?: ChainedMarketLevel[];
  /** Display label for the last level's "Other" outcome (a real "none of the listed" option). */
  finalOtherLabel?: string;
};

export const MARKET_OVERRIDES: Record<string, MarketOverride> = {
  '0xc2b8E25675db9977AD14BcA62b655E4aa6B36683': {
    title: 'Seer Merch for Devcon Mumbai',
    description:
      'This market is used to choose which Seer merch designs will be produced for Devcon Mumbai.\n\nCommunity ideas were collected and turned into design mockups. Each design is listed as an outcome of this multicategorical market. Once the market resolves, 5 designs become the official Seer merch for Devcon Mumbai.\n\nWinning submissions get printed and earn $100 in trading credits each.',
    submissionsMarket: 'seer-devcon-2026-merch',
    submissions: {
      'Purple Seer Apparel Set :Tshirt+hat': 'Purple Seer Apparel Set (Tshirt+hat)_',
      'Proof of Belonging Tshirt': 'Proof of Belonging Tshirt',
      'See What The Market Believes T shirt': 'See What The Market Believes T shirt',
      'Seer Apparel Purple Set : Hoodie+hat': 'Seer Apparel Purple Set (Hoodie+hat)_',
      'Seer Polo : Predict Everything. See Tomorrow.':
        'Seer Polo _  _Predict Everything. See Tomorrow._',
      'Seer Falcon Hoodie': 'Seer Falcon Hoodie_',
      'Seer merch full set: Tshirt, stickers and bottles':
        'Seer merch full set_ Tshirt, stickers and bottles',
      'Seer prediction chart Tshirt': 'Seer prediction chart Tshirt',
      'The Future, In Sight Seer Tshirt': 'The Future, In Sight Seer Tshirt',
      'Minimal purple-on-lavender eye graphic Seer Merch set: tote bag +tshirt':
        'Minimal purple-on-lavender eye graphic Seer Merch set_ tote bag +tshirt_',
      'White and Cyan Seer mersh set: Hoodie +tshirt':
        'White and Cyan Seer mersh set_ Hoodie +tshirt',
      'Minimalist Seer Mersh set: Hoodies+ tote bag+ cap':
        'Minimalist Seer Mersh set_ Hoodies+ tote bag+ cap',
      'Minimalist purple Seer hoodie': 'Minimalist purple Seer hoodie',
      'Seer prediction Journal': 'Seer prediction Journal_',
      'Minimalist black Seer hoodie': 'Minimalist black Seer hoodie',
      'Seer Compass Shirt': 'Seer Compass Shirt',
      'The Seer eye Oversized T shirt': 'The Seer eye Oversized T shirt',
    },
  },
  '0xe7850b0d928aa40ab8732BD323Fa4F6Ef3c24B8a': {
    title: 'Seer Rebrand Contest',
    description:
      'This market is used to choose which visual identity Seer will select for its rebrand.\n\nEvery submission is listed as an outcome of this multi-scalar market. Traders buy shares in the direction they believe the team will pick. Final selection stays with the team, with market prices as the community signal.\n\nThe winning entry receives $3,000. The top 5 submissions by price also receive Seer credits.',
    submissionsMarket: 'seer-rebrand',
    submissions: {
      'Electric Foundation': '@hypedsgn-Electric Foundation',
      Convergent: '@abiyebee-Convergent',
      'Constellation Oracle': '@syntropicregen-Constellation Oracle',
      Prism: 'Mohammad-Prism',
      'Civic Signal': '@brodaviktor-Civic Signal',
      'Your only base layer for decision infrastructure.':
        '@Kaysolo58-Your only base layer for decision infrastructure',
      'Geometric + Initial': '@posifer001-Geometric + Initial',
      'Signal Dark': '@ajitu871287-Signal Dark',
      Datum: '@2reb_fl-Datum',
      'Resolution Mark': 'Elijah- Resolution Mark',
      'Crow Minimal': '@sue2432-Crow Minimal',
      Converge: 'asa_wagmi-Converge',
      'Sleek for Seer': '@Ergamjee-Sleek for Seer',
      'Signal Convergence': 'MrFroggert -Signal Convergence',
      'Purple Horizon': 'Schofield-Purple Horizon',
      'The Composable Identity': 'Melissa-The Composable Identity',
    },
    portfolios: {
      'Electric Foundation':
        'https://www.behance.net/gallery/252825507/Seer-Brand-Identity-App-Redesign',
      'Civic Signal': 'https://seercivicsignal.netlify.app',
      'Your only base layer for decision infrastructure.':
        'https://www.behance.net/gallery/253579443/Seer-Rebrand',
      'Geometric + Initial': 'https://www.behance.net/gallery/253587035/_',
      'Signal Dark': 'https://seer-app--chiomashura400.replit.app',
      'Sleek for Seer':
        'https://www.behance.net/gallery/253606531/Seer-Brand-Identity',
    },
  },
  '0x8b3C7f3f09f6A85353926D8ee0f12decc1C9A5e8': {
    title: 'Seer AI Job Board Name',
    description:
      'Seer is experimenting with a futarchy-run organization that will build a job board for AI: humans and AIs post tasks, AI completes them and gets paid in crypto. Step one is picking the name.\n\nEvery name suggested by the community is listed as an outcome. Traders buy shares in the name they believe will be adopted.\n\nThe chosen name earns $1,000 in crypto (if Seer can use it). By suggesting a name, its author transfers all rights to it, effective only once the $1,000 is paid. If several people suggested the same name, the earliest reply wins.',
    chainedMarkets: [
      { marketId: '0x8b3C7f3f09f6A85353926D8ee0f12decc1C9A5e8', otherIndex: 78 },
      { marketId: '0xf6A42aF200C181Df45e0f3Fd49D58F5D57bb7D35', otherIndex: 78 },
      { marketId: '0x144364dB8EDD6225248fE9d02f77ECc3ec0E4C4c', otherIndex: null },
    ],
    finalOtherLabel: 'None of the listed names',
  },
};

export const CONFIGURED_MARKET_IDS = Object.keys(MARKET_OVERRIDES);

export function getMarketOverride(marketId: string): MarketOverride | undefined {
  const needle = marketId.toLowerCase();
  const key = Object.keys(MARKET_OVERRIDES).find((k) => k.toLowerCase() === needle);
  return key ? MARKET_OVERRIDES[key] : undefined;
}

export function getMarketDisplayTitle(
  marketId: string,
  fallbackName: string | null | undefined
): string {
  return getMarketOverride(marketId)?.title ?? fallbackName ?? 'Market';
}

export function getChainedLevels(marketId: string): ChainedMarketLevel[] | undefined {
  const levels = getMarketOverride(marketId)?.chainedMarkets;
  return levels && levels.length > 1 ? levels : undefined;
}

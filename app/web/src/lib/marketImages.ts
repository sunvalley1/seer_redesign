import { type Market, MarketTypes, getMarketType, isInvalidOutcome } from "@seer-pm/sdk";

// Standard Yes/No outcome pictures
const YES_IMAGE = "https://cdn.kleros.link/ipfs/QmYqRkLTN4Z3tPG7sUNvGnGW72x2TEaS5g5ZWjUsaYTgxp";
const NO_IMAGE = "https://cdn.kleros.link/ipfs/QmSeRcoGmkUqCo8gcexeCrwHLewMa1qmMYd1NWJLtK887X";

// Scalar DOWN/UP outcome pictures
export const DOWN_IMAGE = "/assets/outcomes/yes-no-style-glow-only/down-dark.svg";
export const UP_IMAGE = "/assets/outcomes/yes-no-style-glow-only/up-dark.svg";

// Markets whose icon needs a white backdrop
const WHITE_ICON_BG_MARKETS = new Set(["0x2324741962ff5b8331dbbdc88de8cf1c06fa5ca8"]);

export function getOutcomeImages(market: Market, images = market.images?.outcomes): string[] | undefined {
  if (market.type !== "Generic") return images;
  const marketType = getMarketType(market);
  if (marketType === MarketTypes.SCALAR) {
    const next = [...(images ?? [])];
    next[0] = DOWN_IMAGE;
    next[1] = UP_IMAGE;
    return next;
  }
  if (marketType !== MarketTypes.CATEGORICAL) return images;
  const labels = market.outcomes.map((outcome) => outcome.trim().toLowerCase());
  const yes = labels.indexOf("yes");
  const no = labels.indexOf("no");
  const hasOtherOutcomes = labels.some((_, i) => i !== yes && i !== no && !isInvalidOutcome(market, i));
  if (yes < 0 || no < 0 || hasOtherOutcomes) return images;
  const next = [...(images ?? [])];
  next[yes] = YES_IMAGE;
  next[no] = NO_IMAGE;
  return next;
}

// Portfolio rows only carry the outcome name
export function getOutcomeImageByName(outcome: string, image?: string) {
  if (outcome === "DOWN") return DOWN_IMAGE;
  if (outcome === "UP") return UP_IMAGE;
  return image;
}

export function needsWhiteIconBg(marketId: string) {
  return WHITE_ICON_BG_MARKETS.has(marketId.toLowerCase());
}

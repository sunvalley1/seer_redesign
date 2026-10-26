import { RISK_PRICING_MARKET_ID } from "@/consts/markets";

// The Seer backend lowercases market ids when storing favorites,
// so always compare and send the lowercased form.
export const SUBSCRIBED_MARKET_ID = RISK_PRICING_MARKET_ID.toLowerCase();

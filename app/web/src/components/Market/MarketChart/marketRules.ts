export interface MarketRules {
  readonly summary: string;
  readonly details: string;
}

const MARKET_RULES: Readonly<Record<string, MarketRules>> = {
  // Israel 2026 election
  "0x31cb54c49479243333594eb7343d31f6bd1ddfd3": {
    summary: "Resolves to the party or joint list that wins the most Knesset seats in Israel’s 2026 election.",
    details:
      "Based on the Central Elections Committee’s final results for the 27 October 2026 vote. Yashar is Gadi Eisenkot’s party and Together is Naftali Bennett’s list with Yesh Atid; any other list counts as “Others”. A tie for first place makes the question Invalid.",
  },
  // RN candidate wins, if Le Pen runs
  "0xbbf8f7e40a9234d965f59802c1b3720b21bcc32e": {
    summary: "Resolves “Yes” if the National Rally’s candidate wins the next French presidential election.",
    details:
      "Conditional on Marine Le Pen being RN’s candidate: shares only pay out if the parent market resolves “Yes”. Settled by the result the Constitutional Council proclaims; the first round is on 18 April 2027 and the runoff on 2 May 2027.",
  },
  // Le Pen as RN candidate
  "0xe1793927eb763864967426fe7750ab0dc6f019f3": {
    summary:
      "Resolves “Yes” if Marine Le Pen is the National Rally’s candidate in the next French presidential election.",
    details:
      "Settled by the Constitutional Council’s official list of candidates for the April 2027 election. A July 2026 appeal ruling left her eligible to run, but her final appeal to the Court of Cassation is still pending.",
  },
  // French National Assembly seats by bloc
  "0xabe35cf0953169d9384f5953633f02996b4802f9": {
    summary:
      "Reports how many of the 577 National Assembly seats each bloc wins at the next French legislative election.",
    details:
      "Uses the Interior Ministry’s official results, grouping winners by the party labels listed in each outcome. Each bloc’s shares redeem for its seats divided by the total. The election is due by June 2029 unless the Assembly is dissolved earlier.",
  },
  // RN candidate wins, if Le Pen doesn't run
  "0xfe414db77da686f2050877565b7223b7da4b7c36": {
    summary: "Resolves “Yes” if the National Rally’s candidate wins the next French presidential election.",
    details:
      "Conditional on Marine Le Pen not being RN’s candidate: shares only pay out if the parent market resolves “No”. Settled by the result the Constitutional Council proclaims; the first round is on 18 April 2027 and the runoff on 2 May 2027.",
  },
  // Polymarket negative-risk cost basis fix
  "0xfe8abb3b55acca31e74243349573801c379507b3": {
    summary:
      "Resolves “Yes” if Polymarket publicly releases a fix for negative-risk mint/merge cost basis accounting before 1 January 2027.",
    details:
      "The fix must be shipped and made public, for example in Polymarket’s changelog, docs or an official announcement; acknowledging the issue or promising a fix doesn’t count. “Yes” can be reported once it’s released, “No” only after the deadline.",
  },
  // Polymarket API fees per position
  "0x022f8516fb5af0a6a86a37d48494ceb407298bc2": {
    summary:
      "Resolves “Yes” if Polymarket’s API lets anyone retrieve the fees paid on individual positions by 1 January 2027.",
    details:
      "Judged from Polymarket’s API documentation and changelog. Since August 2026 the positions endpoint has returned entryFeesUsdc, the buy fees attributed to each position; sell fees are not included.",
  },
  // Polymarket oracle other than UMA
  "0xbde8f9b2148e74431faea5d9cf2a815ef6518b42": {
    summary:
      "Resolves “Yes” if Polymarket uses an oracle other than UMA to resolve at least one subjective market before 1 January 2027.",
    details:
      "A subjective market needs human judgment to resolve; markets settled automatically by data feeds, such as Chainlink-priced crypto markets, don’t count. As of October 2026, Polymarket’s subjective markets resolve through UMA.",
  },
  // Polymarket API total fees per user
  "0x38b161f9f6ffbda19a11c32dd73db3f61b00003a": {
    summary:
      "Resolves “Yes” if Polymarket’s public API documents an endpoint returning the total fees a user has paid by 1 January 2027.",
    details:
      "The endpoint itself must return a user’s total; adding up per-trade or per-position fee fields doesn’t count. As of October 2026, fee data is available per position (entryFeesUsdc) but not as a per-user total.",
  },
  // Kurdish attack inside Iran
  "0xc57764377e06fa317457a123b2c25f031c088e17": {
    summary: "Resolves “Yes” if a Kurdish militant group carries out a confirmed armed attack inside Iran during 2026.",
    details:
      "Attacks on Iranian territory by groups such as PJAK, the KDPI or Komala, confirmed by credible reporting, count; Iranian strikes on these groups and fighting outside Iran don’t. Clashes in western Iran were reported from June 2026.",
  },
  // Polymarket clarification notes
  "0x736feaf877de6523ca001ab3e3a229e80d7af00b": {
    summary:
      "Counts Polymarket clarification notes published before 1 January 2027 that move a market’s price 25+ points within 24 hours.",
    details:
      "A note counts if the affected market’s price moves at least 25 percentage points, e.g. from 40% to 65%, within 24 hours of publication. Scalar 10–50: UP pays (answer − 10) ÷ 40 and DOWN the rest; answers outside the range pay UP or DOWN in full.",
  },
  // Greenland sovereignty treaty
  "0x0b5f90febc2fc44c43985b2a712f159ca059d93a": {
    summary:
      "Resolves “Yes” if a binding treaty transferring sovereignty over Greenland from Denmark to the U.S. enters into force in 2026.",
    details:
      "The transfer must legally take effect in 2026; signing or announcing a deal isn’t enough. Defence and access deals don’t count, including the September 2026 U.S.–Denmark–Greenland security agreement, which keeps Greenland under Danish sovereignty.",
  },
  // US hostilities with a NATO country over Greenland
  "0x9510c9bad4b5831f86d771403365a83f619e8aeb": {
    summary:
      "Resolves “Yes” if U.S. forces engage in armed hostilities with the forces of a NATO country over Greenland during 2026.",
    details:
      "Requires an actual use of military force between the two sides tied to Greenland, confirmed by credible reporting. Threats, troop deployments, exercises and sanctions don’t count.",
  },
  // Court ruling against Polymarket
  "0xcef8554bad70c8f46b4242662286d0f03ce77899": {
    summary:
      "Resolves “Yes” if a court rules against Polymarket by the end of 2026 in a lawsuit over an incorrect market resolution.",
    details:
      "Needs a court decision against Polymarket on the claims; filing a suit or settling it doesn’t count. In July 2026 two traders sued Polymarket in New York over its resolution of a market on Strategy selling bitcoin.",
  },
  // Polymarket token distribution
  "0xe659d844b813ae908473e9d0f0981a5c33cf638f": {
    summary:
      "Resolves “Yes” if Polymarket distributes a transferable Polymarket cryptocurrency token to existing users before 1 January 2027.",
    details:
      "Tokens must actually be delivered or claimable, for example through an airdrop; announcements, points or non-transferable rewards don’t count. Polymarket has said a POLY token is planned, but none had launched by October 2026.",
  },
  // CLARITY Act in the Senate
  "0xe820d073f8885f4a24328ba9fbb8a745114bb647": {
    summary: "Resolves “Yes” if the full U.S. Senate passes the Digital Asset Market Clarity Act during 2026.",
    details:
      "Only a floor vote passing the bill counts, not committee approval or procedural votes. The House passed it in July 2025, and in the Senate a cloture vote to open debate failed 49–50 on 15 September 2026.",
  },
  // Ethereum base fee, January 2027
  "0x2324741962ff5b8331dbbdc88de8cf1c06fa5ca8": {
    summary:
      "Reports the average Ethereum base fee, in gwei, for 1–31 January 2027 (UTC), calculated from block data on Dune.",
    details:
      "Takes the mean base fee of all mainnet blocks in that period. Scalar 0.1–120 gwei: UP pays (answer − 0.1) ÷ 119.9 and DOWN the rest; answers outside the range pay UP or DOWN in full. Base fees have mostly stayed under 1 gwei in 2026.",
  },
  // Maxwell pardon
  "0x0a2e852ade1b60ceae19e2d9a6f0a97da2d0dc06": {
    summary:
      "Resolves “Yes” if Donald Trump grants Ghislaine Maxwell an official presidential pardon by 31 December 2026.",
    details:
      "A full or conditional pardon counts; a commutation or other clemency doesn’t. Maxwell is serving a 20-year federal sentence, and in July 2026 the Senate passed a non-binding resolution opposing a pardon.",
  },
  // SEC action against Justin Sun
  "0x394c593c402fff1754fcc4d5d953dc6ff0dc6c21": {
    summary:
      "Resolves “Yes” if the SEC opens a new enforcement action against Justin Sun in 2026 over Binance-related trading activity.",
    details:
      "Requires a new SEC complaint or administrative proceeding; investigations don’t count, nor does the 2023 case that ended in March 2026. In early 2026 Sun was publicly accused of manipulating TRX through Binance accounts; the claims are unverified.",
  },
  // South Sudan 2026 election
  "0x2c04736e1698d13a554cca3558e7bfe9f5334a00": {
    summary:
      "Resolves to Salva Kiir Mayardit if he wins South Sudan’s 2026 presidential election, and to “Others” if anyone else does.",
    details:
      "Based on the National Elections Commission’s final results. The vote is set for 22 December 2026, the first since independence, after several delays; if no presidential election is held in 2026, the question resolves Invalid.",
  },
  // GTA VI first-day sales
  "0x67ea7fc200ff1c2a8817c1efd4b56cdd6ef0a060": {
    summary: "Resolves “Yes” if GTA VI sells more copies on its first day than any earlier Grand Theft Auto game.",
    details:
      "The record to beat is GTA V’s 11.21 million copies in 24 hours (Guinness World Records). Units count, not revenue, using Take-Two/Rockstar figures or credible industry reports. GTA VI launches on 19 November 2026.",
  },
  // US Senate 2026 seats
  "0x36e2b9d28a3cbf15712d09b79f3362d049a4eba9": {
    summary: "Resolves to the party that wins the most of the U.S. Senate seats contested in the 2026 elections.",
    details:
      "Counts seats won in the 35 races on 3 November 2026, including the Ohio and Florida specials and any runoffs, not overall control of the Senate. Independents count as “Other”. Republicans are defending 22 of the seats, Democrats 13.",
  },
  // SBF pardon
  "0x612f809c9a09c2cd64aaa37fa9e858391707bc1e": {
    summary: "Resolves “Yes” if Sam Bankman-Fried receives a U.S. presidential pardon at any time in 2026.",
    details:
      "A full or conditional pardon counts; a commutation doesn’t. The Second Circuit upheld his fraud conviction in June 2026, the month he applied for clemency; Trump said in January he did not plan to pardon him.",
  },
  // Euro stablecoins by chain
  "0x21e5fc95afe520e0e26acccb28daed15d48e2555": {
    summary: "Resolves to the blockchain holding the most euro-pegged stablecoins on DefiLlama on 31 December 2026.",
    details:
      "Compares DefiLlama’s per-chain totals for stablecoins with peg type EUR. Unlisted chains, such as Base, count as “Other Blockchains”. In mid-2026 Ethereum held about 70% of the supply, with Solana second.",
  },
};

export function getMarketRules(marketId: string): MarketRules | undefined {
  return MARKET_RULES[marketId.toLowerCase()];
}

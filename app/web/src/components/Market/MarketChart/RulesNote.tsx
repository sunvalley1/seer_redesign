import { ANSWERED_TOO_SOON, type Market, MarketTypes, displayScalarBound, getMarketType } from "@seer-pm/sdk";
import clsx from "clsx";
import { useState } from "react";
import { getMarketRules } from "./marketRules";

const KLEROS_ARBITRATORS = new Set(["0x68154ea682f95bf582b80dd6453fa401737491dc"]);

function formatTimeout(seconds: number) {
  const days = seconds / 86400;
  if (days >= 1) return `${Number(days.toFixed(1))} ${days === 1 ? "day" : "days"}`;
  const hours = seconds / 3600;
  return `${Number(hours.toFixed(1))} ${hours === 1 ? "hour" : "hours"}`;
}

function getDefaultSummary(market: Market) {
  switch (getMarketType(market)) {
    case MarketTypes.SCALAR:
      return `Resolves to the reported value; UP and DOWN pay out by where it falls between ${displayScalarBound(market.lowerBound)} and ${displayScalarBound(market.upperBound)}.`;
    case MarketTypes.MULTI_SCALAR:
      return "Each outcome resolves to its own reported value and redeems for its share of the total.";
    case MarketTypes.MULTI_CATEGORICAL:
      return "Resolves to every outcome that correctly answers the question, each redeeming for an equal share.";
    default:
      return "Resolves to the outcome that correctly answers the question, as reported on Reality.eth.";
  }
}

function getDefaultDetails(market: Market) {
  const question = market.questions[0];
  const arbitrator =
    question && KLEROS_ARBITRATORS.has(question.arbitrator.toLowerCase()) ? "Kleros" : "the market’s arbitrator";
  const window = question ? formatTimeout(Number(question.timeout)) : "the challenge period";
  return `Settled through Reality.eth: answers become final if unchallenged for ${window}, and disputes go to ${arbitrator} under Seer’s Markets Resolution Policy. Questions that can’t be answered as written resolve Invalid.`;
}

function getTooSoonNote(market: Market) {
  const now = Date.now() / 1000;
  const count = market.questions.filter(
    (question) => question.best_answer === ANSWERED_TOO_SOON && question.finalize_ts > 0 && question.finalize_ts <= now,
  ).length;
  if (count === 0) return "";
  return count > 1
    ? " Early answers were ruled “Answered too soon”, so the questions must be reopened."
    : " An early answer was ruled “Answered too soon”, so the question must be reopened.";
}

export default function RulesNote({ market }: { market: Market }) {
  const [open, setOpen] = useState(false);
  const rules = getMarketRules(market.id);
  const summary = rules?.summary ?? getDefaultSummary(market);
  const details = `${rules?.details ?? getDefaultDetails(market)}${getTooSoonNote(market)}`;

  return (
    <div className={clsx("chart-note", open && "rules-open")} id="rules-note">
      <p className="rules-lead">
        <span className="rules-label">Rules:</span> {summary}
      </p>
      <div className="rules-more-wrap">
        <div className="rules-more">
          <p>{details}</p>
        </div>
      </div>
      <button className="rules-toggle" type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

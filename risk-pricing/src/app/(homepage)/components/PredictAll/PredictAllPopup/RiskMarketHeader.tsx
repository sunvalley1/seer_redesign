import React, { useMemo } from "react";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

import {
  NO_TO_ALL_COLOR,
  sortOutcomesByCategory,
} from "@/app/(homepage)/components/RiskPricing/constants";
import {
  selectHasAssetPrediction,
  selectNoToAllProbability,
  useRiskPredictionStore,
} from "@/store/riskMarketStore";

import { useAssetColorMap } from "@/hooks/useAssetColorMap";

import LightButton from "@/components/LightButton";
import { ScrollFade } from "@/components/ScrollFade";

import CloseIcon from "@/assets/svg/close-icon.svg";
import ArrowDown from "@/assets/svg/long-arrow-down.svg";
import ArrowUp from "@/assets/svg/long-arrow-up.svg";

import { formatPd, isUndefined } from "@/utils";

const RiskMarketHeader: React.FC = () => {
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const predictions = useRiskPredictionStore((state) => state.riskPredictions);
  const removePrediction = useRiskPredictionStore(
    (state) => state.removePrediction,
  );
  // "No To All" has no stored prediction - it is prod(1 - p_i) over the assets.
  const noToAllProbability = useRiskPredictionStore(selectNoToAllProbability);
  const hasAssetPrediction = useRiskPredictionStore(selectHasAssetPrediction);
  const colorOf = useAssetColorMap();
  // Same category grouping as the sliders this list mirrors.
  const sortedOutcomes = useMemo(
    () => sortOutcomesByCategory(outcomes, ({ outcome }) => outcome),
    [outcomes],
  );
  const hasPredictions = Object.entries(predictions).some(
    ([predictionOutcomeId, prediction]) => {
      const marketProbability = outcomes.find(
        (outcome) => outcome.outcomeId === predictionOutcomeId,
      )?.probability;
      return prediction !== undefined && prediction !== marketProbability;
    },
  );
  return (
    <div
      className={clsx(
        "mb-4 min-h-28 w-full shrink grow-0",
        "flex flex-col items-center gap-4",
      )}
    >
      <h2 className="panel-title shrink-0">Predict</h2>
      <ScrollFade
        className={clsx("rounded-base w-full shrink", "max-h-40 min-h-18")}
      >
        {!hasPredictions ? (
          <p className="text-sb-ink-4 py-4 text-center text-[13px]">
            No predictions yet — move a slider to differ from the market.
          </p>
        ) : null}
        <div className="flex w-full flex-col gap-1.5">
          <AnimatePresence>
            {sortedOutcomes.slice(0, -1).map((outcome, index, legs) => {
              // "No To All" is the last leg here (the slice drops only
              // "Invalid"), and it has no stored prediction of its own. It is
              // still traded on every submission - usePredictRiskFlow prices it
              // as computePrices().priceY - so it belongs in this list whenever
              // the assets move it, not only when the user drags its own
              // slider.
              const isNoToAll = index === legs.length - 1;
              const prediction = isNoToAll
                ? hasAssetPrediction
                  ? noToAllProbability
                  : undefined
                : predictions[outcome.outcomeId];
              // not a truthiness test: a PD of exactly 0 is still traded, so
              // it has to be listed
              if (
                prediction === undefined ||
                prediction === outcome.probability
              )
                return;
              return (
                <motion.div
                  className={clsx(
                    "bg-sb-bg-2 relative w-full rounded-lg",
                    "flex items-center gap-3 py-2.5 pr-10 pl-3.5",
                  )}
                  key={outcome.outcomeId}
                  layout
                  initial={{ opacity: 0, y: 0, scale: 1 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.5 }}
                  transition={{ duration: 0.25 }}
                >
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      // colorOf only maps assets; without this "No To All"
                      // would fall through to the "Funds Based" purple.
                      backgroundColor: isNoToAll
                        ? NO_TO_ALL_COLOR
                        : colorOf(outcome.outcome),
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sb-ink truncate text-[14px] font-semibold">
                      {outcome.outcome}
                    </p>
                    {!isUndefined(outcome.probability) ? (
                      <label
                        className={clsx(
                          "text-[12px] font-medium",
                          prediction > outcome.probability
                            ? "text-sb-pos"
                            : "text-sb-neg",
                        )}
                      >
                        {prediction > outcome.probability ? (
                          <ArrowUp className="[&_path]:fill-sb-pos mr-1 inline size-3" />
                        ) : (
                          <ArrowDown className="[&_path]:fill-sb-neg mr-1 inline size-3" />
                        )}
                        {`${prediction > outcome.probability ? "Higher" : "Lower"} than the market`}
                      </label>
                    ) : null}
                    {isNoToAll ? (
                      <p className="text-sb-ink-4 text-[12px]">
                        Derived from your asset predictions
                      </p>
                    ) : null}
                  </div>
                  <span className="text-sb-ink font-mono text-[13px] font-semibold tabular-nums">
                    {formatPd((prediction ?? 0) * 100)}
                  </span>
                  {/* No remove button on "No To All": there is no store key to
                      delete, and the leg cannot be dropped without also
                      dropping the asset predictions that imply it. */}
                  {!isNoToAll && hasPredictions ? (
                    <LightButton
                      className="absolute top-1/2 right-2 -translate-y-1/2 p-1"
                      ariaLabel={`Remove ${outcome.outcome} prediction`}
                      text=""
                      icon={
                        <CloseIcon className="[&_path]:stroke-klerosUIComponentsSecondaryText size-4" />
                      }
                      onPress={() => removePrediction(outcome.outcomeId)}
                    />
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollFade>
    </div>
  );
};

export default RiskMarketHeader;

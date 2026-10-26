import React from "react";

import { Tooltip } from "@kleros/ui-components-library";
import { formatUnits } from "viem";

import { Skeleton } from "@/components/Skeleton";

import { formatValue, isUndefined, shortenName } from "@/utils";

interface IProjectAmount {
  balance?: bigint;
  name: string;
  color: string;
}

const ProjectAmount: React.FC<IProjectAmount> = ({ balance, name, color }) => {
  // `undefined` means "still loading", which is not the same as a zero balance -
  // rendering formatUnits(0n) for it showed a confident, wrong 0.
  const isLoading = isUndefined(balance);

  return (
    <div className="border-sb-border bg-sb-surface flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <Tooltip text={name} closeDelay={125}>
          <label className="text-sb-ink-2 truncate text-[13px] font-medium">
            {shortenName(name)}
          </label>
        </Tooltip>
      </span>
      {isLoading ? (
        <Skeleton className="h-4 w-14" />
      ) : (
        <span
          className="text-sb-ink font-mono text-[13px] font-semibold tabular-nums"
          title={formatUnits(balance, 18)}
        >
          {formatValue(balance)}
        </span>
      )}
    </div>
  );
};

export default ProjectAmount;

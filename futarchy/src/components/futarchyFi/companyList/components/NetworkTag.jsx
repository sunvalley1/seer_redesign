import React from "react";
import ChainBadge from "./ChainBadge";

const NETWORKS = {
  1: {
    label: "Ethereum Network",
    fg: "#627EEA",
    bg: "rgba(98, 126, 234, 0.12)",
    darkFg: "#93A6F5",
    darkBg: "rgba(147, 166, 245, 0.14)",
    logo: "/assets/networks/ethereum.webp",
  },
  100: {
    label: "Gnosis Network",
    fg: "#04795B",
    bg: "rgba(4, 121, 91, 0.10)",
    darkFg: "#34C795",
    darkBg: "rgba(52, 199, 149, 0.12)",
    logo: "/assets/networks/gnosis.webp",
  },
};

const NetworkTag = ({ chainId, className = "" }) => {
  const network = NETWORKS[chainId];
  if (!network) return <ChainBadge chainId={chainId} size="sm" />;

  return (
    <span
      title={network.label}
      className={`inline-flex items-center gap-[7px] rounded-full py-1 pl-1.5 pr-3 font-mono text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap text-[color:var(--nt-fg)] bg-[color:var(--nt-bg)] dark:text-[color:var(--nt-dark-fg)] dark:bg-[color:var(--nt-dark-bg)] ${className}`}
      style={{
        "--nt-fg": network.fg,
        "--nt-bg": network.bg,
        "--nt-dark-fg": network.darkFg,
        "--nt-dark-bg": network.darkBg,
      }}
    >
      <img
        src={network.logo}
        alt=""
        width={14}
        height={14}
        className="shrink-0 rounded-full"
        style={{ boxShadow: "0 0 0 1px color-mix(in srgb, currentColor 30%, transparent)" }}
      />
      {network.label}
    </span>
  );
};

export default NetworkTag;

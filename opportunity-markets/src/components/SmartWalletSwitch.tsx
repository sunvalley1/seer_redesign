import { labelClass } from './tradeStyles';

interface SmartWalletSwitchProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  /** What the batch bundles with the approvals, for the hover hint. */
  action?: string;
}

export function SmartWalletSwitch({
  enabled,
  onChange,
  action = 'the trade',
}: SmartWalletSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        id="smart-wallet-label"
        className={labelClass}
        title={`Batches approvals and ${action} into one transaction via EIP-7702.`}
      >
        Use smart wallet
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="smart-wallet-label"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up ${
          enabled ? 'border-up/60 bg-brand' : 'border-edge-strong bg-wall'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-3.5 w-3.5 rounded-full transition-transform ${
            enabled ? 'translate-x-[18px] bg-paper' : 'translate-x-[2px] bg-muted'
          }`}
        />
      </button>
    </div>
  );
}

export default SmartWalletSwitch;

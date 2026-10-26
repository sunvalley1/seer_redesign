import { Button } from "@/components/ui";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";

export const WalletConnect = () => {
  const { isConnecting } = useAccount();
  const { open } = useAppKit();

  return (
    <Button
      variant="primary"
      size="sm"
      className="h-[38px] px-[18px] !text-body"
      loading={isConnecting}
      onClick={() => open({ view: "Connect" })}
    >
      {isConnecting ? "Connecting" : "Connect wallet"}
    </Button>
  );
};

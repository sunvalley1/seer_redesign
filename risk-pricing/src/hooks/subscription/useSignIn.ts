import { useMutation } from "@tanstack/react-query";
import { signMessage } from "@wagmi/core";
import { Address } from "viem";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { useAccount } from "wagmi";

import { useSeerAuthStore } from "@/store/seerAuthStore";
import { config } from "@/wagmiConfig";

import { DEFAULT_CHAIN } from "@/consts";

export interface SignInResult {
  token: string;
  user: {
    id: Address;
    email: string | null;
  };
}

export const useSignIn = () => {
  const { address } = useAccount();
  const setAuth = useSeerAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (): Promise<SignInResult> => {
      if (!address) throw new Error("Wallet not connected");

      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign In to Seer with Ethereum.",
        uri: window.location.origin,
        version: "1",
        chainId: DEFAULT_CHAIN.id,
        nonce: generateSiweNonce(),
        // signature is valid only for 10 mins
        expirationTime: new Date(Date.now() + 10 * 60 * 1000),
      });
      const signature = await signMessage(config, { message });

      const response = await fetch("/api/seer/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      if (!response.ok) {
        throw new Error(`Failed to sign in: ${response.statusText}`);
      }

      const result: SignInResult = await response.json();
      setAuth(result.token, address);
      return result;
    },
  });
};

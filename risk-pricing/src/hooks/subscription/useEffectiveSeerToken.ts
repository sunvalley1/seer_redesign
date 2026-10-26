import { useAccount } from "wagmi";

import { useSeerAuthStore } from "@/store/seerAuthStore";

import { isTokenExpired } from "@/utils/seerAuth";

/**
 * Returns the Seer access token only when it is usable: present,
 * not expired, and issued for the currently connected account.
 */
export function useEffectiveSeerToken(): string | null {
  const { address } = useAccount();
  const token = useSeerAuthStore((state) => state.token);
  const tokenAddress = useSeerAuthStore((state) => state.tokenAddress);

  if (!token || !address || !tokenAddress) return null;
  if (tokenAddress.toLowerCase() !== address.toLowerCase()) return null;
  if (isTokenExpired(token)) return null;
  return token;
}

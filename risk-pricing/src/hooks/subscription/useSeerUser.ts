import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { fetchSeerAuth } from "@/utils/seerAuth";

import { useEffectiveSeerToken } from "./useEffectiveSeerToken";

export interface SeerUser {
  id: string;
  email: string | null;
  email_verified: boolean;
}

export const useSeerUser = () => {
  const { address } = useAccount();
  const token = useEffectiveSeerToken();

  return useQuery<SeerUser>({
    queryKey: ["seerUser", address?.toLowerCase()],
    enabled: !!token,
    staleTime: 0,
    // poll while waiting for the user to click the verification link
    refetchInterval: (query) =>
      query.state.data?.email && !query.state.data.email_verified
        ? 15_000
        : false,
    queryFn: async () => {
      const { user } = await fetchSeerAuth<{ user: SeerUser }>(
        token!,
        "me",
        "GET",
      );
      return user;
    },
  });
};

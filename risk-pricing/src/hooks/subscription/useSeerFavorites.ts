import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { fetchSeerAuth } from "@/utils/seerAuth";

import { useEffectiveSeerToken } from "./useEffectiveSeerToken";

// Returns the lowercased market ids the user has favorited on Seer.
export const useSeerFavorites = () => {
  const { address } = useAccount();
  const token = useEffectiveSeerToken();

  return useQuery<string[]>({
    queryKey: ["seerFavorites", address?.toLowerCase()],
    enabled: !!token,
    staleTime: 0,
    queryFn: () => fetchSeerAuth<string[]>(token!, "collections", "GET"),
  });
};

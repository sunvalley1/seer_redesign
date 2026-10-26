import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { fetchSeerAuth, UnauthorizedError } from "@/utils/seerAuth";

import { SUBSCRIBED_MARKET_ID } from "@/consts/seer";

import { useEffectiveSeerToken } from "./useEffectiveSeerToken";

export const useSubscribe = () => {
  const { address } = useAccount();
  const token = useEffectiveSeerToken();
  const queryClient = useQueryClient();
  const addressKey = address?.toLowerCase();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["seerUser", addressKey] });
    queryClient.invalidateQueries({ queryKey: ["seerFavorites", addressKey] });
  };

  // Always re-fetch favorites right before toggling: the collections
  // endpoint is a toggle, so acting on stale data would unsubscribe.
  const fetchFreshFavorites = (authToken: string) =>
    queryClient.fetchQuery({
      queryKey: ["seerFavorites", addressKey],
      queryFn: () => fetchSeerAuth<string[]>(authToken, "collections", "GET"),
      staleTime: 0,
    });

  const toggleFavorite = (authToken: string) =>
    fetchSeerAuth(authToken, "collections", "POST", {
      marketIds: [SUBSCRIBED_MARKET_ID],
      collectionId: null,
    });

  const subscribe = useMutation({
    mutationFn: async ({
      email,
      currentEmail,
      currentEmailVerified,
    }: {
      email: string;
      currentEmail: string | null;
      currentEmailVerified: boolean;
    }) => {
      if (!token) throw new UnauthorizedError();
      // POST /me resets email_verified and re-sends the verification
      // mail, so skip it for an unchanged, already-verified email.
      // For an unchanged but unverified email we do call it, so the
      // user gets a fresh verification link.
      if (email !== currentEmail || !currentEmailVerified) {
        await fetchSeerAuth(token, "me", "POST", { email });
      }
      const favorites = await fetchFreshFavorites(token);
      if (!favorites.includes(SUBSCRIBED_MARKET_ID)) {
        await toggleFavorite(token);
      }
    },
    onSettled: invalidate,
  });

  const unsubscribe = useMutation({
    mutationFn: async () => {
      if (!token) throw new UnauthorizedError();
      const favorites = await fetchFreshFavorites(token);
      if (favorites.includes(SUBSCRIBED_MARKET_ID)) {
        await toggleFavorite(token);
      }
    },
    onSettled: invalidate,
  });

  const resendVerification = useMutation({
    mutationFn: async (email: string) => {
      if (!token) throw new UnauthorizedError();
      await fetchSeerAuth(token, "me", "POST", { email });
    },
    onSettled: invalidate,
  });

  return { subscribe, unsubscribe, resendVerification };
};

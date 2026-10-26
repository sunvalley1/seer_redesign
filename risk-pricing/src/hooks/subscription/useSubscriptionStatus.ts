import { useEffect } from "react";

import { useAccount } from "wagmi";

import { useSeerAuthStore } from "@/store/seerAuthStore";

import { UnauthorizedError } from "@/utils/seerAuth";

import { SUBSCRIBED_MARKET_ID } from "@/consts/seer";

import { useEffectiveSeerToken } from "./useEffectiveSeerToken";
import { useSeerFavorites } from "./useSeerFavorites";
import { useSeerUser } from "./useSeerUser";

export enum SubscriptionStatus {
  DISCONNECTED = "DISCONNECTED",
  NOT_SIGNED_IN = "NOT_SIGNED_IN",
  LOADING = "LOADING",
  NEEDS_EMAIL = "NEEDS_EMAIL",
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  SUBSCRIBED = "SUBSCRIBED",
  ERROR = "ERROR",
}

export const useSubscriptionStatus = () => {
  const { isConnected } = useAccount();
  const token = useEffectiveSeerToken();
  const clearAuth = useSeerAuthStore((state) => state.clearAuth);

  const userQuery = useSeerUser();
  const favoritesQuery = useSeerFavorites();

  const error = userQuery.error ?? favoritesQuery.error;
  // a 401 means the token died server-side; drop it so the
  // flow falls back to the sign-in step instead of erroring
  useEffect(() => {
    if (error instanceof UnauthorizedError) clearAuth();
  }, [error, clearAuth]);

  const user = userQuery.data;
  const favorites = favoritesQuery.data;
  const isFavorited = favorites?.includes(SUBSCRIBED_MARKET_ID) ?? false;

  let status: SubscriptionStatus;
  if (!isConnected) {
    status = SubscriptionStatus.DISCONNECTED;
  } else if (!token) {
    status = SubscriptionStatus.NOT_SIGNED_IN;
  } else if (userQuery.isError || favoritesQuery.isError) {
    status = SubscriptionStatus.ERROR;
  } else if (!user || !favorites) {
    status = SubscriptionStatus.LOADING;
  } else if (isFavorited && user.email) {
    status = user.email_verified
      ? SubscriptionStatus.SUBSCRIBED
      : SubscriptionStatus.PENDING_VERIFICATION;
  } else {
    status = SubscriptionStatus.NEEDS_EMAIL;
  }

  return { status, user, isFavorited, error };
};

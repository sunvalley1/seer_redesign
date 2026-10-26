import { Address } from "viem";
import { create } from "zustand";

type Store = {
  token: string | null;
  // address the token was issued for, to invalidate on account switch
  tokenAddress: Address | null;
  setAuth: (token: string, tokenAddress: Address) => void;
  clearAuth: () => void;
};

export const useSeerAuthStore = create<Store>((set) => ({
  token: null,
  tokenAddress: null,

  setAuth: (token, tokenAddress) => set(() => ({ token, tokenAddress })),

  clearAuth: () => set(() => ({ token: null, tokenAddress: null })),
}));

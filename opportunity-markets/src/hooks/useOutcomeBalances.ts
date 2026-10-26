import { useQuery } from '@tanstack/react-query';
import { useConfig } from 'wagmi';
import { readContracts } from 'wagmi/actions';
import { erc20Abi, type Address } from 'viem';

/**
 * Balances of many outcome tokens in one multicall, aligned with `tokens`.
 * The key starts with `useTokenBalances` so the SDK's invalidateAfterTrade refreshes it.
 */
export function useOutcomeBalances(
  owner: Address | undefined,
  tokens: readonly Address[],
  chainId: number
) {
  const config = useConfig();
  return useQuery({
    enabled: Boolean(owner) && tokens.length > 0,
    queryKey: ['useTokenBalances', owner, 'multicall', chainId, tokens],
    queryFn: async (): Promise<bigint[]> => {
      const results = await readContracts(config, {
        allowFailure: true,
        contracts: tokens.map((address) => ({
          address,
          abi: erc20Abi,
          functionName: 'balanceOf' as const,
          args: [owner!] as const,
          chainId,
        })),
      });
      return results.map((r) => (r.status === 'success' ? (r.result as bigint) : 0n));
    },
    refetchOnWindowFocus: true,
  });
}

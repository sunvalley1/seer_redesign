import { useReadGnosisRouterGetWinningOutcomes } from "@/generated";

export const useGetWinningOutcomes = (
  conditionId: `0x${string}` | undefined,
) => {
  return useReadGnosisRouterGetWinningOutcomes({
    args: conditionId ? [conditionId] : undefined,
    query: { enabled: !!conditionId },
  });
};

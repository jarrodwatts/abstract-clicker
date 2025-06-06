import { useQuery } from "@tanstack/react-query";
import estimateGasForClick from "@/lib/transaction/estimateGas";
import { useAccount } from "wagmi";

/**
 * Hook to estimate the gas cost of a click transaction
 */
export function useClickGasEstimate() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["estimateGas", "click"],
    queryFn: () => estimateGasForClick(address as `0x${string}`),
    staleTime: 300 * 1000, // 5 minutes
    enabled: !!address,
  });
}

export default useClickGasEstimate;

import { useReadContract } from "wagmi";
import {
  COOKIE_CLICKER_CONTRACT_ADDRESS,
  COOKIE_CLICKER_CONTRACT_ABI,
} from "@/const/contracts";

/**
 * Hook to read the total number of clicks from the contract from all players
 */
export default function useTotalClicks() {
  const { data: totalClicks, isLoading } = useReadContract({
    address: COOKIE_CLICKER_CONTRACT_ADDRESS,
    abi: COOKIE_CLICKER_CONTRACT_ABI,
    functionName: "totalClicks",
  });

  return {
    totalClicks: totalClicks ? Number(totalClicks) : 0,
    isLoading,
  };
}

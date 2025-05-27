import { useReadContract } from "wagmi";
import { COOKIE_CLICKER_CONTRACT_ABI as cookieClickerABI } from "@/const/contracts";
import { cookieClickerAddress } from "@/const/addresses";

export default function useTotalClicks() {
  const { data: totalClicks, isLoading } = useReadContract({
    address: cookieClickerAddress,
    abi: cookieClickerABI,
    functionName: "totalClicks",
  });

  return {
    totalClicks: totalClicks ? Number(totalClicks) : 0,
    isLoading,
  };
}

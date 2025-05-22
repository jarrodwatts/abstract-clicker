import {
  COOKIE_CLICKER_CONTRACT_ABI,
  COOKIE_CLICKER_CONTRACT_ADDRESS,
} from "@/const/contracts";
import { publicClient } from "@/const/publicClient";

export default async function getUserClicks(address: `0x${string}`) {
  const clicks = await publicClient.readContract({
    address: COOKIE_CLICKER_CONTRACT_ADDRESS,
    abi: COOKIE_CLICKER_CONTRACT_ABI,
    functionName: "getClicksForUser",
    args: [address],
  });
  return Number(clicks);
}

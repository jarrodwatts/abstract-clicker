import { COOKIE_CLICKER_CONTRACT_ADDRESS } from "@/const/contracts";
import { publicClient } from "@/const/publicClient";
import { toFunctionSelector } from "viem";

export default async function estimateGasForClick(address: `0x${string}`) {
  const estimate = await publicClient.estimateGas({
    to: COOKIE_CLICKER_CONTRACT_ADDRESS,
    data: toFunctionSelector("click()"),
    account: address,
  });
  return estimate;
}

import { COOKIE_CLICKER_CONTRACT_ADDRESS } from "@/const/contracts";
import { publicClient } from "@/const/publicClient";
import { toFunctionSelector } from "viem";

export default async function estimateGasForClick(address: `0x${string}`) {
  const gasLimit = await publicClient.estimateGas({
    to: COOKIE_CLICKER_CONTRACT_ADDRESS,
    data: toFunctionSelector("click()"),
    account: address,
  });

  const { maxFeePerGas, maxPriorityFeePerGas } =
    await publicClient.estimateFeesPerGas();

  if (maxFeePerGas === null || maxPriorityFeePerGas === null) {
    throw new Error(
      "Failed to estimate gas fees. One of the fee parameters is null."
    );
  }

  console.log({ gasLimit, maxFeePerGas, maxPriorityFeePerGas });

  return { gasLimit, maxFeePerGas, maxPriorityFeePerGas };
}

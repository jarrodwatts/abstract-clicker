import { COOKIE_CLICKER_CONTRACT_ADDRESS } from "@/const/contracts";
import { publicClient } from "@/const/publicClient";
import { toFunctionSelector } from "viem";

/**
 * Estimate the gas cost of a click transaction
 * @param address - The address of the user making the transaction
 * @returns the gas limit and max fee per gas
 */
export default async function estimateGasForClick(address: `0x${string}`) {
  const gasLimit = await publicClient.estimateGas({
    to: COOKIE_CLICKER_CONTRACT_ADDRESS,
    data: toFunctionSelector("click()"),
    account: address,
  });

  const adjustedGasLimit = (gasLimit * 15n) / 10n;

  const { maxFeePerGas, maxPriorityFeePerGas } =
    await publicClient.estimateFeesPerGas();

  if (maxFeePerGas === null || maxPriorityFeePerGas === null) {
    throw new Error(
      "Failed to estimate gas fees. One of the fee parameters is null."
    );
  }

  console.log({ gasLimit, maxFeePerGas, maxPriorityFeePerGas });

  return { gasLimit: adjustedGasLimit, maxFeePerGas, maxPriorityFeePerGas };
}

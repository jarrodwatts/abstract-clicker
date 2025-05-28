import { publicClient } from "@/const/publicClient";

/**
 * Get the current nonce for a wallet address
 * @param address - The address of the user
 * @returns the nonce
 */
export default async function getNonce(address: `0x${string}`) {
  const nonce = await publicClient.getTransactionCount({
    address: address,
  });
  return nonce;
}

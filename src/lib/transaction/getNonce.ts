import { publicClient } from "@/const/publicClient";

export default async function getNonce(address: `0x${string}`) {
  const nonce = await publicClient.getTransactionCount({
    address: address,
  });
  return nonce;
}

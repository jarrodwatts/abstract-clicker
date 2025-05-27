import { COOKIE_CLICKER_CONTRACT_ADDRESS, SESSION_KEY_VALIDATOR_ADDRESS } from "@/const/contracts";
import { chain } from "@/const/chain";
import { Account, Address, Hash, Hex, http, maxUint256, RpcLog, toFunctionSelector } from "viem";
import {
  createSessionClient,
  SessionConfig,
} from "@abstract-foundation/agw-client/sessions";

type RpcStorageLog = {
  address: Address,
  key: Hex,
  writtenValue: Hex
}
type SendRawTransactionWithDetailedOutputResponse = {
  transactionHash: Hash
  storageLogs: RpcStorageLog[],
  events: RpcLog[],
}

export default async function signClickTx(
  agwAddress: `0x${string}`,
  sessionSigner: Account,
  session: SessionConfig,
  nonce: number
): Promise<{ txHash: `0x${string}`; timeTaken: number }> {
  const startTime = performance.now();

  const sessionClient = createSessionClient({
    account: agwAddress,
    chain,
    signer: sessionSigner,
    session,
    transport: http(),
  });

  const signature = await sessionClient.signTransaction({
    to: COOKIE_CLICKER_CONTRACT_ADDRESS as `0x${string}`,
    data: toFunctionSelector("click()"),
    type: "eip712",
    chain,
    nonce,
    chainId: chain.id,
    maxPriorityFeePerGas: 0n,
    maxFeePerGas: 30000000n,
    gas: 350000n,
    optimistic: {
      balance: maxUint256,
      isDeployed: true,
      validationHooks: [SESSION_KEY_VALIDATOR_ADDRESS]
    }
  });

  // 6. Send the raw transaction
  const result = await sessionClient.transport.request({
    method: "zks_sendRawTransactionWithDetailedOutput",
    params: [signature]
  }) as SendRawTransactionWithDetailedOutputResponse;

  const endTime = performance.now();
  console.log(`⏱️: ${(endTime - startTime).toFixed(2)}ms`);

  console.log(response);

  if (response.error) {
    // Handle RPC errors
    console.error("RPC Error:", response.error);
    // Specific handling for "known transaction"
    if (
      response.error.message &&
      response.error.message.includes("known transaction")
    ) {
      // This case might not always be an "error" in the sense that the tx failed,
      // but rather that it was already processed or is in mempool.
      // For now, we'll throw a specific error.
      // The calling code (MiningGame.tsx) might need to handle this differently,
      // e.g., by not immediately marking the mini-game as "failed"
      // or by attempting to fetch the transaction receipt if a hash was previously stored.
      throw new Error(
        `Known transaction: ${response.error.message} (Code: ${response.error.code})`
      );
    }
    throw new Error(
      `RPC Error: ${response.error.message} (Code: ${response.error.code})`
    );
  }

  if (!response.result || !response.result.transactionHash) {
    // This case handles scenarios where there's no RPC error, but the result is not as expected
    // (e.g., result is null or transactionHash is missing)
    console.error(
      "Transaction submission succeeded but no transaction hash was returned in the result.",
      response
    );
    throw new Error(
      "Transaction submission did not return a transaction hash. Session key might be expired or another issue occurred."
    );
  }

  return {
    txHash: result.transactionHash,
    timeTaken: endTime - startTime,
  };
}


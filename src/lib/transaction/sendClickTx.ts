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

  return {
    txHash: result.transactionHash,
    timeTaken: endTime - startTime,
  };
}


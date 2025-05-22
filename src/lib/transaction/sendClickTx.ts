import {
  COOKIE_CLICKER_CONTRACT_ADDRESS,
  SESSION_KEY_VALIDATOR_ADDRESS,
} from "@/const/contracts";
import { chain, VALID_CHAINS } from "@/const/chain";
import {
  Account,
  BaseError,
  encodeAbiParameters,
  getTypesForEIP712Domain,
  Hex,
  parseAbiParameters,
  toFunctionSelector,
} from "viem";
import {
  createSessionClient,
  SessionConfig,
} from "@abstract-foundation/agw-client/sessions";
import { walletClient } from "@/const/walletClient";
import { getPeriodIdsForTransaction } from "../agw/getPeriodIdsForTransaction";
import {
  assertEip712Request,
  AssertEip712RequestParameters,
  transformEip712TypedData,
  transformHexValues,
} from "../agw/transformEip712TypedData";
import { encodeSessionWithPeriodIds } from "../agw/encodeSessionWithPeriodIds";
import { signTypedData } from "viem/actions";
import { publicClient } from "@/const/publicClient";
import { AGWAccountAbi } from "@abstract-foundation/agw-client/constants";

export default async function signClickTx(
  agwAddress: `0x${string}`,
  sessionSigner: Account,
  session: SessionConfig,
  nonce: number,
  gas: bigint
) {
  const preparedTransaction = await walletClient.prepareTransactionRequest({
    to: COOKIE_CLICKER_CONTRACT_ADDRESS as `0x${string}`,
    data: toFunctionSelector("click()"),
    type: "eip712",
    chain,
    nonce,
    chainId: chain.id,
    maxPriorityFeePerGas: 0n,
    maxFeePerGas: 30000000n,
    gas: 350000n,
  });

  const sessionClient = createSessionClient({
    account: agwAddress,
    chain,
    signer: sessionSigner,
    session,
  });

  // @ts-ignore
  const signature = await sessionClient.signTransaction(preparedTransaction);

  // 6. Send the raw transaction
  const response = await sendRawTransactionWithDetailedOutput(signature);
  return response;
}

export async function sendRawTransactionWithDetailedOutput(
  signedTransaction: string
) {
  const response = await fetch("https://api.testnet.abs.xyz", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "zks_sendRawTransactionWithDetailedOutput",
      params: [signedTransaction],
    }),
  });

  const data = await response.json();
  console.log("Transaction response:", data);

  return data;
}

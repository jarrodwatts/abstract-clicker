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
import { SessionConfig } from "@abstract-foundation/agw-client/sessions";
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
  const transaction = {
    to: COOKIE_CLICKER_CONTRACT_ADDRESS as `0x${string}`,
    data: toFunctionSelector("click()"),
    chain,
    chainId: chain.id,
    nonce,
    maxPriorityFeePerGas: 0n,
    maxFeePerGas: 30000000n,
    gas: 150000n,
    from: agwAddress,
    type: `eip712`, // EIP-712 transaction type for ZKsync
    gasPerPubdata: 1212n, // Required for ZKsync transactions
  };

  console.log(`transaction:`, transaction);

  const validationHookData = {
    [SESSION_KEY_VALIDATOR_ADDRESS]: encodeSessionWithPeriodIds(
      session,
      getPeriodIdsForTransaction({
        sessionConfig: session,
        target: transaction.to as `0x${string}`,
        selector: (transaction.data?.slice(0, 10) ?? "0x") as Hex,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      })
    ),
  };

  console.log(`validationHookData:`, validationHookData);

  transformHexValues(transaction, [
    "value",
    "nonce",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "gas",
    "chainId",
    "gasPerPubdata",
  ]);

  assertEip712Request({
    account: agwAddress,
    chain,
    ...(transaction as AssertEip712RequestParameters),
  });

  if (!chain || VALID_CHAINS[chain.id] === undefined) {
    throw new BaseError("Invalid chain specified");
  }

  if (!chain?.custom?.getEip712Domain)
    throw new BaseError("`getEip712Domain` not found on chain.");

  console.log(`transaction:`, transaction);

  const transactionWithPaymaster = {
    ...transaction,
    from: agwAddress,
    chainId: chain.id,
  };

  if (transactionWithPaymaster.data === undefined) {
    // serializer turns undefined into 0x00 which causes issues sending
    // eth to contracts that don't have a fallback function
    transactionWithPaymaster.data = "0x";
  }

  console.log(`transactionWithPaymaster:`, transactionWithPaymaster);

  const eip712Domain = chain?.custom.getEip712Domain({
    ...transactionWithPaymaster,
    type: "eip712",
  });

  console.log(`eip712Domain:`, eip712Domain);

  const rawSignature = await signTypedData(walletClient, {
    ...eip712Domain,
    account: sessionSigner,
  });

  console.log(`rawSignature:`, rawSignature);

  const hookData: Hex[] = [];

  const validationHooks = await publicClient.readContract({
    address: agwAddress,
    abi: AGWAccountAbi,
    functionName: "listHooks",
    args: [true],
  });

  for (const hook of validationHooks) {
    hookData.push(
      validationHookData[hook as keyof typeof validationHookData] ?? "0x"
    );
  }

  // Match the expect signature format of the AGW smart account
  const signature = encodeAbiParameters(
    parseAbiParameters(["bytes", "address", "bytes[]"]),
    [rawSignature, SESSION_KEY_VALIDATOR_ADDRESS, hookData]
  );

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

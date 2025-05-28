import { COOKIE_CLICKER_CONTRACT_ADDRESS } from "@/const/contracts";
import { API_URL, chain, paymasterFields } from "@/const/chain";
import { Account, http, toFunctionSelector } from "viem";
import {
  createSessionClient,
  SessionConfig,
} from "@abstract-foundation/agw-client/sessions";
import { walletClient } from "@/const/walletClient";

// Here we just do some disgusting stuff to intercept RPC requests that are not neceessary
// This is just a in-code hack since the AGW SDK doesn't have a function to call the
// zks_sendRawTransactionWithDetailedOutput endpoint just yet.
// So, it's a hack to use the convenience of the seession client SDK but also
// have the ability to call the zks_sendRawTransactionWithDetailedOutput endpoint.

// Store original fetch
const originalFetch = global.fetch;

// Flag to track if we're in session creation
let isCreatingSession = false;

// Function to set session creation mode
export const setSessionCreationMode = (mode: boolean) => {
  isCreatingSession = mode;
};

// Override fetch to intercept RPC requests
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  // If we're creating a session, use original fetch
  if (isCreatingSession) {
    return originalFetch(input, init);
  }

  if (
    typeof input === "string" &&
    input.includes(chain.rpcUrls.default.http[0])
  ) {
    if (init?.body) {
      // We always know chain id for AGW so we can just return it
      const body = JSON.parse(init.body as string);
      if (body.method === "eth_chainId") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            result: `0x${chain.id.toString(16)}`,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // This is a check to see if the AGW is deployed or not yet
      // We are optimistically overriding it to assume it's deployed
      if (body.method === "eth_getCode") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            result:
              "0x0010000000000002000000600310027000000024033001970001000000310355000000000031035500020000003103550003000000310355000400000031035500050000003103550006000000310355000700000031035500080000003103550009000000310355000a000000310355000b000000310355000c000000310355000d000000310355000e000000310355000f0000003103550000000100200190000000270000c13d0000008002000039000000400020043f0000002802000041000000000202041a000000000300041400000000001004060000002c0030009c0000005e0000413d0000002f01000041000000800010043f0000002001000039000000840010043f0000000801000039000000a40010043f0000003001000041000000c40010043f0000003101000041000000820000013d0000000002000416000000000002004b0000005c0000c13d0000001f0230003900000025022001970000008002200039000000400020043f0000001f0430018f00000026053001980000008002500039000000380000613d0000008006000039000000000701034f000000007807043c0000000006860436000000000026004b000000340000c13d000000000004004b000000450000613d000000000151034f0000000304400210000000000502043300000000054501cf000000000545022f000000000101043b0000010004400089000000000141022f00000000014101cf000000000151019f0000000000120435000000200030008c0000005c0000413d000000800500043d000000270050009c0000005c0000213d0000002801000041000000000051041b0000000001000414000000240010009c0000002401008041000000c00110021000000029011001c70000800d0200003900000002030000390000002a04000041008d00830000040f00000001002001900000005c0000613d0000002001000039000001000010044300000120000004430000002b010000410000008e0001042e00000000010000190000008f000104300000000001100400000000c0033002100000002d033001970000002e033001c700000000003103b500000000013103af0000002702200197008d00880000040f00000060051002700000001f0450018f0000002603500198000000700000613d000000000601034f0000000007000019000000006806043c0000000007870436000000000037004b0000006c0000c13d0000002405500197000000000004004b0000007e0000613d000000000131034f0000000304400210000000000603043300000000064601cf000000000646022f000000000101043b0000010004400089000000000141022f00000000014101cf000000000161019f000000000013043500000060015002100000000100200190000000820000613d0000008e0001042e0000008f0001043000000086002104210000000102000039000000000001042d0000000002000019000000000001042d0000008b002104250000000102000039000000000001042d0000000002000019000000000001042d0000008d000004320000008e0001042e0000008f0001043000000000000000000000000000000000000000000000000000000000ffffffff00000000000000000000000000000000000000000000000000000001ffffffe000000000000000000000000000000000000000000000000000000000ffffffe0000000000000000000000000ffffffffffffffffffffffffffffffffffffffff360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc0200000000000000000000000000000000000000000000000000000000000000bc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b0000000200000000000000000000000000000040000001000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000ffffffff000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000008c379a0000000000000000000000000000000000000000000000000000000004f766572666c6f7700000000000000000000000000000000000000000000000000000000000000000000000000000000000000640000008000000000000000005abc2033c6ab799fea3fb626a476ea5a27f5abb655e1539da50cf77842e426e3",
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // This is a check to read some info about the AGW, like validation hooks etc.
      // We don't need this for the game, so we can just return this here.
      if (
        body.method === "eth_call" &&
        body.params[0].data ==
          "0xdb8a323f0000000000000000000000000000000000000000000000000000000000000001"
      ) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            result:
              "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000034ca1501fae231cc2ebc995ce013dbe882d7d081",
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
  }
  return originalFetch(input, init);
};

/**
 * This is the function that performs all the actual magic of the app.
 * It submits the transaction to the zks_sendRawTransactionWithDetailedOutput endpoint.
 * Which immediately returns a tx hash + submits the tx on-chain.
 */
export default async function signClickTx(
  agwAddress: `0x${string}`,
  sessionSigner: Account,
  session: SessionConfig,
  nonce: number,
  gas: bigint,
  maxFeePerGas: bigint,
  maxPriorityFeePerGas: bigint
): Promise<{ txHash: `0x${string}`; timeTaken: number }> {
  // Begin the timer now to see how long it takes to submit the transaction
  const startTime = performance.now();

  // Format the transaction for EIP-712.
  const preparedTransaction = await walletClient.prepareTransactionRequest({
    to: COOKIE_CLICKER_CONTRACT_ADDRESS as `0x${string}`,
    data: toFunctionSelector("click()"),
    type: "eip712",
    chain,
    nonce,
    chainId: chain.id,
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    ...paymasterFields,
  });

  // Use the AGW session client to sign the transaction
  const sessionClient = createSessionClient({
    account: agwAddress,
    chain,
    signer: sessionSigner,
    session,
    transport: http(chain.rpcUrls.default.http[0]),
  });

  // Sign the transaction using the session client
  // @ts-expect-error - just annoying type mismatch but its fine.
  const signature = await sessionClient.signTransaction(preparedTransaction);

  // Send the signature to the zks_sendRawTransactionWithDetailedOutput endpoint
  const response = await sendRawTransactionWithDetailedOutput(signature);

  // Stop the timer and log the time taken to get a tx hash back.
  const endTime = performance.now();
  console.log(`⏱️: ${(endTime - startTime).toFixed(2)}ms`);

  // Handle RPC errors
  if (response.error) {
    console.error("RPC Error:", response.error);

    // Parse common error messages to make them more user-friendly
    const errorMessage = response.error.message || "";

    let humanReadableError = "";

    if (errorMessage.includes("insufficient funds")) {
      humanReadableError = "ETH balance too low.";
    } else if (errorMessage.includes("known transaction")) {
      humanReadableError = "Nonce issue. Please refresh.";
    } else if (errorMessage.includes("nonce too low")) {
      humanReadableError = "Nonce issue. Please refresh.";
    } else if (errorMessage.includes("gas required exceeds allowance")) {
      humanReadableError = "Gas issue. Please refresh.";
    } else if (errorMessage.includes("replacement transaction underpriced")) {
      humanReadableError = "Gas issue. Please refresh.";
    } else if (
      errorMessage.includes("max fee per gas less than block base fee")
    ) {
      humanReadableError =
        "Transaction fee too low for current network conditions";
    } else {
      // For unknown errors, use a generic message with the error code
      humanReadableError = `Transaction failed (Error ${errorMessage})`;
    }

    throw new Error(humanReadableError);
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
    txHash: response.result.transactionHash,
    timeTaken: endTime - startTime,
  };
}

/**
 * This is the function that sends the transaction to the zks_sendRawTransactionWithDetailedOutput endpoint.
 * It's a simple wrapper around the fetch call to the API.
 */
export async function sendRawTransactionWithDetailedOutput(
  signedTransaction: string
) {
  const response = await fetch(API_URL, {
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

  return data;
}

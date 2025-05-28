import { createWalletClient, http } from "viem";
import { eip712WalletActions } from "viem/zksync";
import { chain } from "./chain";

// Global Viem wallet client instance
export const walletClient = createWalletClient({
  chain: chain,
  transport: http(),
}).extend(eip712WalletActions());

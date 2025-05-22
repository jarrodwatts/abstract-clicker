import { createPublicClient, http } from "viem";
import { publicActionsL2 } from "viem/zksync";
import { chain } from "./chain";

export const publicClient = createPublicClient({
  chain: chain,
  transport: http(),
}).extend(publicActionsL2());

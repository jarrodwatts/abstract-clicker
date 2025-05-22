import { abstractTestnet, abstract, Chain } from "viem/chains";

/**
 * This exports the chain configuration to be used in the application.
 */
export const chain =
  process.env.NODE_ENV === "production" ? abstractTestnet : abstractTestnet;

export const VALID_CHAINS: Record<number, Chain> = {
  [abstractTestnet.id]: abstractTestnet,
  [abstract.id]: abstract,
};

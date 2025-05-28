import { abstractTestnet, abstract } from "viem/chains";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * This exports the chain configuration to be used in the application.
 */
export const chain = IS_PRODUCTION ? abstract : abstractTestnet;

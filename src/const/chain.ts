import { abstractTestnet, abstract } from "viem/chains";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const chain = IS_PRODUCTION ? abstract : abstractTestnet;

export const API_URL = IS_PRODUCTION
  ? "https://api.mainnet.abs.xyz"
  : "https://api.testnet.abs.xyz";

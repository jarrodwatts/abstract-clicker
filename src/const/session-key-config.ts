import {
  LimitType,
  type SessionConfig,
} from "@abstract-foundation/agw-client/sessions";
import { parseEther, toFunctionSelector } from "viem";
import { COOKIE_CLICKER_CONTRACT_ADDRESS } from "./contracts";

/**
 * Default call policies for session keys
 * Defines which contract functions the session key can call and with what limits
 */
export const DEFAULT_CALL_POLICIES = [
  {
    target: COOKIE_CLICKER_CONTRACT_ADDRESS as `0x${string}`, // NFT contract
    selector: toFunctionSelector("click()"),
    valueLimit: {
      limitType: LimitType.Unlimited,
      limit: BigInt(0),
      period: BigInt(0),
    },
    maxValuePerUse: BigInt(0),
    constraints: [],
  },
];

export const SESSION_KEY_CONFIG: Omit<SessionConfig, "signer"> = {
  expiresAt: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24),
  feeLimit: {
    limitType: LimitType.Lifetime,
    limit: parseEther("1"),
    period: BigInt(0),
  },
  callPolicies: DEFAULT_CALL_POLICIES,
  transferPolicies: [],
};

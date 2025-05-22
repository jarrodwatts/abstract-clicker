import { encodeAbiParameters, Hex, getAbiItem } from "viem";
import { SessionKeyValidatorAbi } from "@/const/contracts";
import { SessionConfig } from "@abstract-foundation/agw-client/sessions";

/**
 * Get the SessionConfig ABI spec
 */
export function getSessionSpec() {
  return getAbiItem({
    abi: SessionKeyValidatorAbi,
    name: "createSession",
  }).inputs[0];
}

/**
 * Encode a session with period IDs
 */
export function encodeSessionWithPeriodIds(
  sessionConfig: SessionConfig,
  periods: bigint[]
): Hex {
  return encodeAbiParameters(
    [getSessionSpec(), { type: "uint64[]" }],
    [sessionConfig, periods]
  );
}

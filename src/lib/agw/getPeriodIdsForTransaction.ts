import {
  SessionConfig,
  Limit,
  LimitType,
  TransferPolicy,
  CallPolicy,
} from "@abstract-foundation/agw-client/sessions";
import { Address, getAddress } from "viem";

/**
 * Get period IDs for a transaction
 */
export function getPeriodIdsForTransaction(args: {
  sessionConfig: SessionConfig;
  target: Address;
  selector?: `0x${string}`;
  timestamp?: bigint;
}): bigint[] {
  const timestamp = args.timestamp || BigInt(Math.floor(Date.now() / 1000));
  const target = getAddress(args.target).toLowerCase() as Address;

  const getId = (limit: Limit): bigint => {
    if (limit.limitType === LimitType.Allowance) {
      return timestamp / limit.period;
    }
    return 0n;
  };

  const findTransferPolicy = (): TransferPolicy | undefined => {
    return args.sessionConfig.transferPolicies.find(
      (policy) => policy.target.toLowerCase() === target
    );
  };

  const findCallPolicy = (): CallPolicy | undefined => {
    return args.sessionConfig.callPolicies.find(
      (policy) =>
        policy.target.toLowerCase() === target &&
        policy.selector === args.selector
    );
  };

  const isContractCall = !!args.selector && args.selector.length >= 10;
  const policy = isContractCall ? findCallPolicy() : findTransferPolicy();

  if (!policy) throw new Error("Transaction does not fit any policy");

  const periodIds = [
    getId(args.sessionConfig.feeLimit),
    getId(policy.valueLimit),
    ...(isContractCall
      ? (policy as CallPolicy).constraints.map((constraint) =>
          getId(constraint.limit)
        )
      : []),
  ];

  return periodIds;
}

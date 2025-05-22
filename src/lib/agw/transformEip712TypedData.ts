import { Hex, toHex, TypedDataDefinition, UnionRequiredBy } from "viem";
import { SignEip712TransactionParameters } from "viem/zksync";
import { type ExactPartial, type OneOf } from "viem";
import { parseAccount } from "viem/utils";
import {
  type ChainEIP712,
  type SendEip712TransactionParameters,
  type ZksyncTransactionRequest,
  type ZksyncTransactionSerializable,
} from "viem/zksync";

export type AssertEip712RequestParameters = ExactPartial<
  SendEip712TransactionParameters<ChainEIP712>
>;

export function isEIP712Transaction(
  transaction: ExactPartial<
    OneOf<ZksyncTransactionRequest | ZksyncTransactionSerializable>
  >
) {
  if (transaction.type === "eip712") return true;
  if (
    ("customSignature" in transaction && transaction.customSignature) ||
    ("paymaster" in transaction && transaction.paymaster) ||
    ("paymasterInput" in transaction && transaction.paymasterInput) ||
    ("gasPerPubdata" in transaction &&
      typeof transaction.gasPerPubdata === "bigint") ||
    ("factoryDeps" in transaction && transaction.factoryDeps)
  )
    return true;
  return false;
}

export function isEip712TypedData(typedData: TypedDataDefinition): boolean {
  return (
    typedData.message &&
    typedData.domain?.name === "zkSync" &&
    typedData.domain?.version === "2" &&
    isEIP712Transaction(typedData.message)
  );
}

export function transformEip712TypedData(
  typedData: TypedDataDefinition
): UnionRequiredBy<
  Omit<SignEip712TransactionParameters, "chain">,
  "to" | "data"
> & { chainId: number } {
  if (!isEip712TypedData(typedData)) {
    throw new Error("Typed data is not an EIP712 transaction");
  }

  if (typedData.domain?.chainId === undefined) {
    throw new Error("Chain ID is required for EIP712 transaction");
  }

  return {
    chainId: Number(typedData.domain.chainId),
    account: parseAccount(
      toHex(BigInt(typedData.message["from"] as string), {
        size: 20,
      })
    ),
    to: toHex(BigInt(typedData.message["to"] as string), {
      size: 20,
    }),
    gas: BigInt(typedData.message["gasLimit"] as string),
    gasPerPubdata: BigInt(
      typedData.message["gasPerPubdataByteLimit"] as string
    ),
    maxFeePerGas: BigInt(typedData.message["maxFeePerGas"] as string),
    maxPriorityFeePerGas: BigInt(
      typedData.message["maxPriorityFeePerGas"] as string
    ),
    paymaster:
      (typedData.message["paymaster"] as string) != "0"
        ? toHex(BigInt(typedData.message["paymaster"] as string), {
            size: 20,
          })
        : undefined,
    nonce: typedData.message["nonce"] as number,
    value: BigInt(typedData.message["value"] as string),
    data:
      typedData.message["data"] === "0x0"
        ? "0x"
        : (typedData.message["data"] as Hex),
    factoryDeps: typedData.message["factoryDeps"] as Hex[],
    paymasterInput:
      typedData.message["paymasterInput"] !== "0x"
        ? (typedData.message["paymasterInput"] as Hex)
        : undefined,
  };
}

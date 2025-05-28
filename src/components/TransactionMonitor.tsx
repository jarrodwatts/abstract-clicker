"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt } from "wagmi";

interface TransactionMonitorProps {
  txHash: `0x${string}`;
  onCompletion: (success: boolean) => void;
  chainId?: number; // Optional: if your hook needs a specific chainId not derived from context
}

/**
 * Simple invisible component that is used to monitor a transaction onchain.
 * Once transactions are included in blocks on-chain, it fades the card out.
 * It also shows a success or failure indicator.
 */
const TransactionMonitor: React.FC<TransactionMonitorProps> = ({
  txHash,
  onCompletion,
  chainId,
}) => {
  const { data, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: chainId,
    pollingInterval: 500,
  });

  useEffect(() => {
    if (isSuccess) {
      console.log("Transaction successful:", txHash, data);
      onCompletion(true);
    } else if (isError) {
      console.error("Transaction failed:", txHash, error);
      onCompletion(false); // Call onCompletion even on error to remove the instance, pass false for success
    }
  }, [isSuccess, isError, onCompletion, txHash, data, error]);

  // This component doesn't render anything itself, it just performs an effect.
  // You could add some logging here if needed while isLoading.
  // if (isLoading) {
  //   console.log('Monitoring transaction:', txHash);
  // }

  return null;
};

export default TransactionMonitor;

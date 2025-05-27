"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt } from "wagmi";

interface TransactionMonitorProps {
  txHash: `0x${string}`;
  onCompletion: () => void;
  chainId?: number; // Optional: if your hook needs a specific chainId not derived from context
}

const TransactionMonitor: React.FC<TransactionMonitorProps> = ({
  txHash,
  onCompletion,
  chainId,
}) => {
  const { data, isLoading, isSuccess, isError, error } =
    useWaitForTransactionReceipt({
      hash: txHash,
      chainId: chainId,
      pollingInterval: 500,
    });

  useEffect(() => {
    if (isSuccess) {
      console.log("Transaction successful:", txHash, data);
      onCompletion();
    } else if (isError) {
      console.error("Transaction failed:", txHash, error);
      onCompletion(); // Call onCompletion even on error to remove the instance
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

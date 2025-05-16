import { useCallback, useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi";
import { useAbstractSession } from "./useAbstractSession";
import {
  COOKIE_CLICKER_CONTRACT_ADDRESS,
  COOKIE_CLICKER_CONTRACT_ABI,
} from "@/const/contracts";
import { privateKeyToAccount } from "viem/accounts";
import chain from "@/const/chain";
import { SessionClient } from "@abstract-foundation/agw-client/sessions";
import { encodeFunctionData } from "viem";

export type TransactionStatus = "pending" | "success" | "failed";

export interface TransactionRecord {
  id: string;
  hash: `0x${string}`;
  timestamp: number;
  status: TransactionStatus;
  error?: string;
  executionTimeMs?: number;
  confirmationTimeMs?: number;
}

// Define a transaction queue item
interface QueuedTransaction {
  id: string;
  execute: () => Promise<void>;
}

export function useCookieClicker() {
  const { address } = useAccount();
  const { data: abstractClient } = useAbstractClient();
  const { hasValidSession, getStoredSession } = useAbstractSession();
  const publicClient = usePublicClient();
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>(
    undefined
  );
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Transaction queue system
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const transactionQueue = useRef<QueuedTransaction[]>([]);
  const processingTransaction = useRef<string | null>(null);
  const isTransactionComplete = useRef<boolean>(true);
  // Session client ref to avoid recreating it on each transaction
  const sessionClientRef = useRef<SessionClient>(null);
  // Timestamp refs for transaction timing
  const executionStartTimeRef = useRef<number>(0);
  const transactionSentTimeRef = useRef<number>(0);

  // Pre-loaded transaction data
  const nonceRef = useRef<number | null>(null);
  const gasEstimateRef = useRef<bigint | null>(null);
  const encodedClickDataRef = useRef<`0x${string}` | null>(null);
  const [preloadingComplete, setPreloadingComplete] = useState(false);

  // Wait for transaction receipt as fallback
  const {
    isLoading: isWaitingForTx,
    data: txReceipt,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  });

  // Pre-load transaction data (nonce, gas estimate, encoded data)
  useEffect(() => {
    const preloadTransactionData = async () => {
      if (!address || !hasValidSession || !publicClient) {
        return;
      }

      try {
        // Pre-calculate encoded function data (this doesn't require any client calls)
        encodedClickDataRef.current = encodeFunctionData({
          abi: COOKIE_CLICKER_CONTRACT_ABI,
          functionName: "click",
          args: [],
        });

        // Start both operations in parallel
        const [nonce, gasEstimate] = await Promise.all([
          // Get initial nonce
          publicClient.getTransactionCount({
            address: address as `0x${string}`,
          }),

          // Estimate gas for click transaction
          publicClient.estimateContractGas({
            address: COOKIE_CLICKER_CONTRACT_ADDRESS as `0x${string}`,
            abi: COOKIE_CLICKER_CONTRACT_ABI,
            functionName: "click",
            args: [],
            account: address as `0x${string}`,
          }),
        ]);

        // Store results
        nonceRef.current = nonce;
        // Add a 10% buffer to the gas estimate
        gasEstimateRef.current = BigInt(Math.ceil(Number(gasEstimate) * 1.1));

        console.log(
          `Pre-loaded transaction data: nonce=${nonce}, gas=${gasEstimate}`
        );
        setPreloadingComplete(true);
      } catch (error) {
        console.error("Error pre-loading transaction data:", error);
      }
    };

    if (address && hasValidSession && publicClient) {
      preloadTransactionData();
    }
  }, [address, hasValidSession, publicClient]);

  // Watch for Click events from our contract
  useWatchContractEvent({
    address: COOKIE_CLICKER_CONTRACT_ADDRESS as `0x${string}`,
    abi: COOKIE_CLICKER_CONTRACT_ABI,
    eventName: "Click",
    onLogs(logs) {
      if (!address || !lastTxHash) return;

      // Check if any log matches our transaction hash
      // We only need to check if the log belongs to our transaction
      const matchingLog = logs.find(
        (log) => log.transactionHash && log.transactionHash === lastTxHash
      );

      if (matchingLog) {
        const now = Date.now();
        const confirmationTimeMs = now - transactionSentTimeRef.current;

        console.log(`Click event detected in ${confirmationTimeMs}ms`);

        // Transaction succeeded based on event
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.hash === lastTxHash
              ? {
                  ...tx,
                  status: "success" as TransactionStatus,
                  confirmationTimeMs,
                }
              : tx
          )
        );

        setIsTransactionPending(false);
        setLastTxHash(undefined);

        // Remove the processed transaction from the queue
        if (processingTransaction.current) {
          transactionQueue.current.shift();
          processingTransaction.current = null;
        }

        // Mark transaction as complete so we can process the next one
        isTransactionComplete.current = true;

        // Increment local nonce tracking after successful transaction
        if (nonceRef.current !== null) {
          nonceRef.current += 1;
          console.log(`Nonce incremented to ${nonceRef.current}`);
        }

        // Process the next transaction in the queue
        processNextTransaction();
      }
    },
  });

  // Process the next transaction in the queue
  const processNextTransaction = useCallback(() => {
    if (transactionQueue.current.length > 0 && isTransactionComplete.current) {
      setIsProcessingQueue(true);
      processQueue();
    } else {
      setIsProcessingQueue(false);
    }
  }, []);

  // Process the transaction queue
  const processQueue = useCallback(async () => {
    // Only process if we have transactions and no current transaction is being processed
    if (
      transactionQueue.current.length === 0 ||
      !isTransactionComplete.current
    ) {
      return;
    }

    try {
      // Mark that we're processing a transaction
      isTransactionComplete.current = false;

      // Take the first transaction from the queue
      const nextTx = transactionQueue.current[0];
      processingTransaction.current = nextTx.id;

      // Execute the transaction
      await nextTx.execute();

      // Note: We don't remove the transaction or mark it as complete yet
      // This will happen when we detect the event or get the receipt
    } catch (error) {
      console.error("Error processing transaction from queue:", error);

      // If there was an error executing the transaction, remove it from the queue
      transactionQueue.current.shift();
      processingTransaction.current = null;

      // Mark that we're ready for the next transaction
      isTransactionComplete.current = true;

      // Try to process the next transaction
      processNextTransaction();
    }
  }, [processNextTransaction]);

  // Watch the queue and process when items are added
  useEffect(() => {
    if (
      transactionQueue.current.length > 0 &&
      isTransactionComplete.current &&
      !isProcessingQueue
    ) {
      processNextTransaction();
    }
  }, [isProcessingQueue, processNextTransaction]);

  // Reset session client when dependencies change
  useEffect(() => {
    // Reset session client when address or abstractClient changes
    sessionClientRef.current = null;

    // Cleanup function to reset the session client when unmounting
    return () => {
      sessionClientRef.current = null;
    };
  }, [address, abstractClient]);

  // Track transaction status changes for fallback receipt
  useEffect(() => {
    if (!lastTxHash) return;

    // Fallback: Update transaction status when receipt is received or error occurs
    if (txReceipt) {
      const now = Date.now();
      const confirmationTimeMs = now - transactionSentTimeRef.current;

      console.log(
        `Transaction confirmed by receipt in ${confirmationTimeMs}ms (fallback)`
      );

      // Transaction succeeded
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.hash === lastTxHash && tx.status === "pending"
            ? {
                ...tx,
                status: "success" as TransactionStatus,
                confirmationTimeMs,
              }
            : tx
        )
      );

      setIsTransactionPending(false);
      setLastTxHash(undefined);

      // Only complete if still pending (not already completed by event)
      if (processingTransaction.current) {
        transactionQueue.current.shift();
        processingTransaction.current = null;

        // Mark transaction as complete so we can process the next one
        isTransactionComplete.current = true;

        // Increment local nonce tracking after successful transaction
        if (nonceRef.current !== null) {
          nonceRef.current += 1;
          console.log(
            `Nonce incremented to ${nonceRef.current} (from receipt)`
          );
        }

        // Process the next transaction in the queue
        processNextTransaction();
      }
    } else if (txError) {
      console.error("Transaction error received:", txError);
      const now = Date.now();
      const confirmationTimeMs = now - transactionSentTimeRef.current;

      console.log(`Transaction failed after ${confirmationTimeMs}ms`);

      // Transaction failed
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.hash === lastTxHash
            ? {
                ...tx,
                status: "failed" as TransactionStatus,
                error: txError.message,
                confirmationTimeMs,
              }
            : tx
        )
      );

      setIsTransactionPending(false);
      setLastTxHash(undefined);

      // Remove the failed transaction from the queue
      if (processingTransaction.current) {
        transactionQueue.current.shift();
        processingTransaction.current = null;
      }

      // Mark transaction as complete so we can process the next one
      isTransactionComplete.current = true;

      // Process the next transaction in the queue
      processNextTransaction();
    }
  }, [lastTxHash, txReceipt, txError, processNextTransaction]);

  // Click function that uses session key
  const clickOnChain = useCallback(async () => {
    if (!address || !hasValidSession || !abstractClient) {
      console.error("No valid session or wallet connection");
      return;
    }

    // Create a pending transaction record immediately
    const pendingTxId = Date.now().toString();
    const pendingTx: TransactionRecord = {
      id: pendingTxId,
      hash: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      timestamp: Date.now(),
      status: "pending",
    };

    // Add the pending transaction to history right away
    setTransactions((prev) => [pendingTx, ...prev]);

    // Create a function to execute this transaction
    const executeTx = async () => {
      executionStartTimeRef.current = Date.now();
      console.log("Transaction execution started");
      setIsTransactionPending(true);

      try {
        // Use cached session client instead of creating it every time
        if (!sessionClientRef.current) {
          // Get session data with private key
          const sessionData = await getStoredSession();

          if (!sessionData) {
            throw new Error("Failed to get session data");
          }

          sessionClientRef.current = abstractClient.toSessionClient(
            privateKeyToAccount(sessionData.privateKey),
            sessionData.session
          );
        }

        // Create transaction with pre-calculated values
        const txParams: any = {
          to: COOKIE_CLICKER_CONTRACT_ADDRESS as `0x${string}`,
          data:
            encodedClickDataRef.current ||
            encodeFunctionData({
              abi: COOKIE_CLICKER_CONTRACT_ABI,
              functionName: "click",
              args: [],
            }),
          account: address,
          chain: chain,
        };

        // Add pre-estimated gas if available
        if (gasEstimateRef.current !== null) {
          txParams.gas = gasEstimateRef.current;
        }

        // Add nonce if we're tracking it
        if (nonceRef.current !== null) {
          txParams.nonce = nonceRef.current;
          // Optimistically increment nonce for next transaction
          nonceRef.current += 1;
          console.log(
            `Using nonce ${txParams.nonce}, incremented to ${nonceRef.current} for next tx`
          );
        }

        // Attempt to use the session client with optimized params
        const hash = await sessionClientRef.current.sendTransaction(txParams);

        const now = Date.now();
        const executionTimeMs = now - executionStartTimeRef.current;
        transactionSentTimeRef.current = now;

        console.log(
          `Transaction sent to blockchain in ${executionTimeMs}ms:`,
          hash
        );

        // Update the pending transaction with the real hash and execution time
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.id === pendingTxId
              ? {
                  ...tx,
                  hash: hash as `0x${string}`,
                  executionTimeMs,
                }
              : tx
          )
        );

        setLastTxHash(hash as `0x${string}`);
      } catch (error) {
        console.error("Error executing transaction:", error);

        // Find the pending transaction and mark it as failed
        if (error instanceof Error) {
          const executionTimeMs = Date.now() - executionStartTimeRef.current;

          setTransactions((prev) =>
            prev.map((tx) => {
              if (tx.id === pendingTxId) {
                return {
                  ...tx,
                  status: "failed" as TransactionStatus,
                  error: error.message,
                  executionTimeMs,
                };
              }
              return tx;
            })
          );
        }

        setIsTransactionPending(false);
        throw error; // Re-throw to be caught in the processQueue function
      }
    };

    // Add this transaction to the queue
    const queuedTx: QueuedTransaction = {
      id: pendingTxId,
      execute: executeTx,
    };

    transactionQueue.current.push(queuedTx);

    // If we're not currently processing the queue and there's no transaction in progress,
    // start processing
    if (isTransactionComplete.current && !isProcessingQueue) {
      processNextTransaction();
    }
  }, [
    address,
    hasValidSession,
    abstractClient,
    getStoredSession,
    isProcessingQueue,
    processNextTransaction,
  ]);

  // Clear transaction history
  const clearTransactionHistory = useCallback(() => {
    setTransactions([]);
  }, []);

  return {
    // Transaction state
    isTransactionPending: isTransactionPending || isWaitingForTx,
    lastTxHash,
    transactions,

    // Queue information
    queueLength: transactionQueue.current.length,
    isProcessingQueue,

    // Optimization info
    preloadingComplete,

    // Actions
    clickOnChain,
    clearTransactionHistory,
  };
}

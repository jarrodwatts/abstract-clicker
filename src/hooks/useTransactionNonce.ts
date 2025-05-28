import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import getNonce from "@/lib/transaction/getNonce";
import { useAccount } from "wagmi";

/**
 * Hook to get the current nonce for a wallet address
 * This is used to prevent users from submitting transactions with the same nonce.
 * It first loads the nonce from on-chain, then increments it locally.
 * Allows for multiple transactions to be fired off in quick succession.
 * i.e. have multilpe transactions from the same user sitting in the mempool
 */
export function useTransactionNonce() {
  const { address } = useAccount();
  const [localNonce, setLocalNonce] = useState<number | undefined>(undefined);

  const nonceQuery = useQuery({
    queryKey: ["nonce", address],
    queryFn: () =>
      address ? getNonce(address) : Promise.reject("No address provided"),
    enabled: !!address,
    staleTime: 5 * 1000, // 5 seconds
  });

  useEffect(() => {
    // Set initial local nonce when first loaded from blockchain
    if (nonceQuery.data !== undefined && localNonce === undefined) {
      setLocalNonce(nonceQuery.data);
    }
  }, [nonceQuery.data, localNonce]);

  // Function to increment the local nonce
  const incrementNonce = () => {
    // Directly use localNonce for the current value.
    if (localNonce === undefined) {
      // This handles the case where incrementNonce is called before nonce is initialized.
      console.error(
        "Attempted to increment nonce, but initial nonce is undefined."
      );
      throw new Error(
        "Failed to increment nonce, initial nonce was undefined."
      );
    }

    const currentNonceToReturn = localNonce;
    setLocalNonce(localNonce + 1);
    return currentNonceToReturn; // Return the current nonce, then update for the next call
  };

  // Force refresh from blockchain
  const refreshNonce = async () => {
    if (address) {
      const freshNonce = await nonceQuery.refetch();
      if (freshNonce.data !== undefined) {
        setLocalNonce(freshNonce.data);
      }
    }
  };

  return {
    nonce: localNonce,
    isLoading:
      address && localNonce === undefined ? nonceQuery.isLoading : false,
    isError: address ? nonceQuery.isError : false,
    error: nonceQuery.error,
    incrementNonce,
    refreshNonce,
    refetch: refreshNonce,
  };
}

export default useTransactionNonce;

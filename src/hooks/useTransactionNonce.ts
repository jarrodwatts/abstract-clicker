import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import getNonce from "@/lib/transaction/getNonce";
import { useAccount } from "wagmi";

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
    if (localNonce !== undefined) {
      setLocalNonce(localNonce + 1);
    }
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

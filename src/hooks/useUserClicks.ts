import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import getUserClicks from "@/lib/transaction/getUserClicks";
import { useAccount } from "wagmi";

/**
 * Hook to read the number of clicks a user has made in the game.
 * First it reads the on-chain value, then stores it in local state.
 * From there, it allows for the local click count to be incremented and refreshed.
 */
export function useUserClicks() {
  const { address } = useAccount();
  const [localClickCount, setLocalClickCount] = useState<number | undefined>(
    undefined
  );

  const clickQuery = useQuery({
    queryKey: ["userClicks", address],
    queryFn: () =>
      address ? getUserClicks(address) : Promise.reject("No address provided"),
    enabled: !!address,
    staleTime: 5 * 1000,
  });

  useEffect(() => {
    if (clickQuery.data !== undefined && localClickCount === undefined) {
      setLocalClickCount(clickQuery.data);
    }
  }, [clickQuery.data, localClickCount]);

  const incrementClickCount = () => {
    setLocalClickCount((oldVal) => {
      if (oldVal !== undefined) return oldVal + 1;
      return oldVal;
    });
  };

  const refreshClickCount = async () => {
    if (address) {
      const freshClicks = await clickQuery.refetch();
      if (freshClicks.data !== undefined) {
        setLocalClickCount(freshClicks.data);
      }
    }
  };

  return {
    clickCount: localClickCount,
    isLoading:
      address && localClickCount === undefined ? clickQuery.isLoading : false,
    isError: address ? clickQuery.isError : false,
    error: clickQuery.error,
    incrementClickCount,
    refreshClickCount,
    refetch: refreshClickCount,
  };
}

export default useUserClicks;

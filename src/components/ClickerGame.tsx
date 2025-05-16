"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import AnimationPreview from "./AnimationPreview";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import Character from "@/types/Character";
import { cn } from "@/lib/utils";
import { useCookieClicker, TransactionStatus } from "@/hooks/useCookieClicker";
import { useAccount } from "wagmi";
import { useAbstractSession } from "@/hooks/useAbstractSession";
import { Button } from "@/components/ui/button";
import chain from "@/const/chain";

// Interface for click feedback animations
interface ClickFeedback {
  id: number;
  x: number;
  y: number;
  value: number;
}

export default function ClickerGame() {
  // Blockchain state
  const { address } = useAccount();
  const { hasValidSession, createAndStoreSession } = useAbstractSession();
  const {
    isTransactionPending,
    clickOnChain,
    transactions,
    clearTransactionHistory,
    queueLength,
    isProcessingQueue,
  } = useCookieClicker();

  // Game state
  const [character, setCharacter] = useState<Character | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [clickScale, setClickScale] = useState<boolean>(false);
  const [clickFeedback, setClickFeedback] = useState<ClickFeedback[]>([]);

  // Element references
  const characterContainerRef = useRef<HTMLDivElement>(null);
  const animationTimeout = useRef<NodeJS.Timeout | null>(null);
  const uniqueIdCounter = useRef<number>(0);

  // Generate a random character on component mount
  useEffect(() => {
    setCharacter(generateRandomCharacter());
  }, []);

  // Create visual feedback animation when clicking
  const createClickFeedback = useCallback(
    (x: number, y: number, value: number) => {
      const id = uniqueIdCounter.current++;

      setClickFeedback((prev) => [...prev, { id, x, y, value }]);

      // Remove the feedback after animation completes
      setTimeout(() => {
        setClickFeedback((prev) => prev.filter((item) => item.id !== id));
      }, 1500);
    },
    []
  );

  // Handle character click to trigger animation and increment score
  const handleCharacterClick = useCallback(
    async (e: React.MouseEvent) => {
      // Create click feedback at mouse position
      if (characterContainerRef.current) {
        const rect = characterContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        createClickFeedback(x, y, 1);
      }

      // Visual feedback
      setClickScale(true);
      setTimeout(() => setClickScale(false), 100);

      // Trigger animation if not already animating
      if (!isAnimating) {
        setIsAnimating(true);

        // Reset animation after animation cycle completes
        if (animationTimeout.current) {
          clearTimeout(animationTimeout.current);
        }

        // Animation duration = 5 frames × 80ms per frame
        animationTimeout.current = setTimeout(() => {
          setIsAnimating(false);
        }, 400);
      }

      // Send transaction if we have a valid session
      if (hasValidSession) {
        try {
          await clickOnChain();
        } catch (error) {
          console.error("Failed to click on-chain:", error);
        }
      }
    },
    [isAnimating, createClickFeedback, hasValidSession, clickOnChain]
  );

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get status style based on status
  const getStatusStyle = (status: TransactionStatus) => {
    switch (status) {
      case "pending":
        return "text-yellow-500";
      case "success":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      default:
        return "";
    }
  };

  // Format hash for display (truncated)
  const formatHash = (hash: string) => {
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  return (
    <div className="flex flex-row gap-6 p-6 w-full max-w-6xl mx-auto">
      {/* Left side - Game */}
      <div className="flex flex-col items-center gap-4 flex-1">
        {/* Character animation preview (clickable) */}
        <div
          ref={characterContainerRef}
          className={cn(
            "relative cursor-pointer rounded-lg p-4 overflow-hidden",
            clickScale ? "scale-95" : "scale-100",
            "transition-transform duration-100"
          )}
          onClick={handleCharacterClick}
        >
          {/* Click feedback animations */}
          {clickFeedback.map(({ id, x, y, value }) => (
            <div
              key={id}
              className="absolute pointer-events-none text-yellow-500 font-bold animate-float-up"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                animation: "float-up 1.5s ease-out forwards",
              }}
            >
              +{value}
            </div>
          ))}

          {character && (
            <AnimationPreview
              character={character}
              action="pickaxe"
              isAnimating={isAnimating || isTransactionPending}
            />
          )}
        </div>

        {/* Transaction and queue status */}
        <div className="flex flex-col items-center">
          {isProcessingQueue && (
            <div className="text-sm text-blue-500 flex items-center gap-1 mb-1">
              <span className="animate-spin text-xs">⚙️</span>
              Processing transaction...
            </div>
          )}

          {queueLength > 0 && (
            <div className="text-sm text-amber-500 flex items-center gap-1">
              <span className="text-xs animate-pulse">⏳</span>
              {queueLength} transaction{queueLength !== 1 ? "s" : ""} queued
            </div>
          )}
        </div>

        {/* Create session button if needed */}
        {address && !hasValidSession && (
          <Button onClick={createAndStoreSession}>Create Session Key</Button>
        )}

        {/* Instructions */}
        {!address && (
          <div className="text-center text-muted-foreground mt-4 p-4 bg-card rounded-lg">
            <p className="font-medium mb-2">
              Connect your wallet to start mining!
            </p>
            <p>Click the character to mine on the blockchain.</p>
          </div>
        )}

        {address && !hasValidSession && (
          <div className="text-center text-muted-foreground mt-2">
            <p>
              Create a session key to mine on-chain without signing each
              transaction.
            </p>
          </div>
        )}
      </div>

      {/* Right side - Transaction history */}
      {address && (
        <div className="flex flex-col w-1/2 bg-card rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Transaction History</h3>
            {transactions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearTransactionHistory}
              >
                Clear
              </Button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No transactions yet
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Tx Hash</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-muted hover:bg-muted/50"
                    >
                      <td className="py-2">{formatDate(tx.timestamp)}</td>
                      <td className="py-2 font-mono">
                        {tx.hash ===
                        "0x0000000000000000000000000000000000000000000000000000000000000000" ? (
                          <span className="text-muted-foreground">
                            Pending...
                          </span>
                        ) : (
                          <a
                            href={`${chain.blockExplorers.default.url}/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {formatHash(tx.hash)}
                          </a>
                        )}
                      </td>
                      <td className={`py-2 ${getStatusStyle(tx.status)}`}>
                        <div className="flex items-center">
                          {tx.status === "pending" && (
                            <span className="animate-pulse mr-1">⚡</span>
                          )}
                          {tx.status}
                        </div>
                        {tx.error && (
                          <div className="text-xs text-red-400 font-normal">
                            {tx.error.substring(0, 50)}
                            {tx.error.length > 50 ? "..." : ""}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-50px) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}

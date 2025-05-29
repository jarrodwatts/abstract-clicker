"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import MiniMiningInstance from "./MiniMiningInstance";
import TransactionMonitor from "./TransactionMonitor";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import Character from "@/types/Character";
import useClickGasEstimate from "@/hooks/useClickGasEstimate";
import useTransactionNonce from "@/hooks/useTransactionNonce";
import { useAbstractSession } from "@/hooks/useAbstractSession";
import { privateKeyToAccount } from "viem/accounts";
import signClickTx from "@/lib/transaction/sendClickTx";
import { useAccount } from "wagmi";
import styles from "./GameFrame.module.css";
import Image from "next/image";
import { chain } from "@/const/chain";
import useUserClicks from "@/hooks/useUserClicks";
import { NumberTicker } from "./magicui/number-ticker";
import { Ripple } from "./magicui/ripple";
import { Pointer } from "./magicui/pointer";
import { v4 as uuidv4 } from "uuid";
import LumberjackDisplayCard from "./LumberjackDisplayCard";

interface LumberjackTier {
  unlockThreshold: number;
  clickIntervalMs: number;
  displayName: string;
  id: string;
}

interface ActiveLumberjack extends LumberjackTier {
  lumberjackId: string; // Unique ID for this specific instance of an unlocked lumberjack
  character: Character; // The visual representation
  timerId?: NodeJS.Timeout; // To store the interval timer
}

interface BurstingWoodEmoji {
  id: string;
  x: number; // viewport X
  y: number; // viewport Y
  randomOffsetX: number;
  randomOffsetY: number;
  randomRotation: number;
}

// Lumberjack Tiers Configuration
const LUMBERJACK_TIERS: LumberjackTier[] = [
  {
    id: "tier1",
    unlockThreshold: 100,
    clickIntervalMs: 10000,
    displayName: "Rookie Logger",
  },
  {
    id: "tier2",
    unlockThreshold: 500,
    clickIntervalMs: 8000,
    displayName: "Apprentice Sawyer",
  },
  {
    id: "tier3",
    unlockThreshold: 2000,
    clickIntervalMs: 5000,
    displayName: "Journeyman Feller",
  },
  {
    id: "tier4",
    unlockThreshold: 10000,
    clickIntervalMs: 2000,
    displayName: "Master Timberman",
  },
  {
    id: "tier5",
    unlockThreshold: 50000,
    clickIntervalMs: 1000,
    displayName: "Forest Whisperer",
  },
  {
    id: "tier6",
    unlockThreshold: 100000,
    clickIntervalMs: 500,
    displayName: "Legendary Woodcutter",
  },
];

interface ActiveMiniGame {
  id: string;
  character: Character;
  initialClickCount: number;
  txHash?: `0x${string}`;
  uiState: "submitting" | "optimistic" | "confirmed" | "failed";
  errorMessage?: string;
  clickTimestamp: number;
  optimisticConfirmTimestamp?: number;
  finalizedTimestamp?: number;
  isVisuallyRemoving?: boolean; // For fade-out effect
}

/**
 * The core code for the game.
 * Controls everything in the game like total click count, clicking, spawning the miner cards, etc.
 */
export default function MiningGame({
  character: initialCharacter,
}: {
  character?: Character;
}) {
  // Get connected wallet address
  const { address } = useAccount();

  // Get session key data
  const { data: sessionData } = useAbstractSession();

  // Read the total number of clicks the uesr has made
  const {
    clickCount,
    isLoading: isClicksLoading,
    incrementClickCount,
  } = useUserClicks();

  // Generate a random character to use throughout the game
  const [character] = useState(
    () => initialCharacter || generateRandomCharacter()
  );

  // Keep track of a separate, "local" click count that is not stored onchain
  // Mainly just used for annoying state management
  const [localClickCount, setLocalClickCount] = useState(0);

  // Keep track of all the active mini-games (the cards that spawn when you click)
  const [activeMiniGames, setActiveMiniGames] = useState<ActiveMiniGame[]>([]);

  // Keep track of all the unlocked lumberjacks
  const [unlockedLumberjacks, setUnlockedLumberjacks] = useState<
    ActiveLumberjack[]
  >([]);
  const lumberjackTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const unlockedLumberjacksRef = useRef(unlockedLumberjacks);
  const clickCountRef = useRef(clickCount);
  const performAutoClickRef = useRef<((id: string) => Promise<void>) | null>(
    null
  );

  // Flag to prevent multiple auto-clicks from happening at once
  const isAutoClickProcessingRef = useRef(false);

  // Animation states
  const [pulseClickCount, setPulseClickCount] = useState(false);
  const [burstingWoodEmojis, setBurstingWoodEmojis] = useState<
    BurstingWoodEmoji[]
  >([]);

  // Flag to prevent users submitting transactions before things are ready.
  // i.e. nonce, gas estimation, etc.
  const [isTransactionReady, setIsTransactionReady] = useState(false);

  // Refs for height synchronization of the left and right columns of the game
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightScrollableContentRef = useRef<HTMLDivElement>(null);

  // Animate the total click count
  useEffect(() => {
    if (typeof clickCount === "number" && clickCount > 0 && !isClicksLoading) {
      setPulseClickCount(true);
      const timer = setTimeout(() => setPulseClickCount(false), 300); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [clickCount, isClicksLoading]);

  // Sync the height of the left and right columns of the game
  useEffect(() => {
    const synchronizeHeights = () => {
      if (leftColumnRef.current && rightScrollableContentRef.current) {
        const leftColumnHeight = leftColumnRef.current.offsetHeight;
        rightScrollableContentRef.current.style.maxHeight = `${leftColumnHeight}px`;
      }
    };

    synchronizeHeights(); // Initial sync

    // This is kind of disgusting AI code but seems to be ok
    // Re-sync if activeMiniGames length changes, as this could affect left column height (though less likely with current fixed content)
    // This might be too frequent if many games are added/removed quickly.
    // A ResizeObserver on the left column would be more performant for dynamic content changes in left col.
    window.addEventListener("resize", synchronizeHeights);
    return () => {
      window.removeEventListener("resize", synchronizeHeights);
    };
  }, [activeMiniGames.length]); // Re-run if the number of games changes, or on mount/unmount

  // Keep unlockedLumberjacksRef updated
  useEffect(() => {
    unlockedLumberjacksRef.current = unlockedLumberjacks;
  }, [unlockedLumberjacks]);

  // Keep clickCountRef updated
  useEffect(() => {
    clickCountRef.current = clickCount;
  }, [clickCount]);

  // Effect to unlock lumberjacks based on clickCount
  useEffect(() => {
    if (typeof clickCount === "number") {
      const newlyUnlocked = LUMBERJACK_TIERS.filter(
        (tier) =>
          clickCount >= tier.unlockThreshold &&
          !unlockedLumberjacks.some((lj) => lj.id === tier.id)
      );

      if (newlyUnlocked.length > 0) {
        const newLumberjacks: ActiveLumberjack[] = newlyUnlocked.map(
          (tier) => ({
            ...tier,
            lumberjackId: uuidv4(),
            character: generateRandomCharacter(), // Each lumberjack gets a unique character
          })
        );
        setUnlockedLumberjacks((prev) => [...prev, ...newLumberjacks]);
      }
    }
  }, [clickCount, unlockedLumberjacks]);

  // Load gas and nonce data upfront
  const gasEstimateQuery = useClickGasEstimate();
  const nonceQuery = useTransactionNonce();

  // Submit the "Click" transaction using the user's session key
  const submitOptimisticTransaction = useCallback(
    async (gameId: string, clickerCharacter: Character, nonceForTx: number) => {
      // First check to see if fields we need have loaded. If not, we can't submit the transaction.
      if (
        !address ||
        !sessionData?.privateKey ||
        !gasEstimateQuery.data ||
        typeof gasEstimateQuery.data.gasLimit === "undefined" ||
        typeof gasEstimateQuery.data.maxFeePerGas === "undefined" ||
        typeof gasEstimateQuery.data.maxPriorityFeePerGas === "undefined" ||
        nonceForTx === undefined
      ) {
        console.error("Transaction pre-requisites not met", {
          address,
          hasSessionPrivateKey: !!sessionData?.privateKey,
          gasEstimateData: gasEstimateQuery.data,
          nonceForTx,
        });
        setActiveMiniGames((prev) =>
          prev.map((g) =>
            g.id === gameId
              ? {
                  ...g,
                  uiState: "failed",
                  errorMessage: "Transaction pre-requisites not met.",
                  finalizedTimestamp: Date.now(),
                  isVisuallyRemoving: false,
                }
              : g
          )
        );
        // Start fade-out process for failed submission
        const FADE_START_DELAY = 1500;
        const FADE_DURATION = 500;
        setTimeout(() => {
          setActiveMiniGames((prev) =>
            prev.map((g) =>
              g.id === gameId ? { ...g, isVisuallyRemoving: true } : g
            )
          );
        }, FADE_START_DELAY);
        setTimeout(() => {
          setActiveMiniGames((prev) => prev.filter((g) => g.id !== gameId));
        }, FADE_START_DELAY + FADE_DURATION);
        return;
      }
      // If we have all the data we need, we can submit the transaction.

      // Create a viem account from the decrypted session private key from local storage.
      const signer = privateKeyToAccount(sessionData.privateKey);

      // Try to submit the transaction.
      try {
        const { txHash } = await signClickTx(
          address,
          signer,
          sessionData.session,
          nonceForTx,
          gasEstimateQuery.data.gasLimit,
          gasEstimateQuery.data.maxFeePerGas,
          gasEstimateQuery.data.maxPriorityFeePerGas
        );
        setActiveMiniGames((prevGames) =>
          prevGames.map((game) =>
            game.id === gameId
              ? {
                  ...game,
                  txHash: txHash,
                  uiState: "optimistic",
                  optimisticConfirmTimestamp: Date.now(),
                }
              : game
          )
        );
      } catch (error) {
        console.error("Error submitting transaction:", error);
        const errorMessage =
          (error instanceof Error ? error.message : String(error)) ||
          "Transaction failed for an unknown reason.";
        setActiveMiniGames((prev) =>
          prev.map((g) =>
            g.id === gameId
              ? {
                  ...g,
                  uiState: "failed",
                  errorMessage: errorMessage,
                  finalizedTimestamp: Date.now(),
                  isVisuallyRemoving: false,
                }
              : g
          )
        );
        // Start fade-out process for failed submission
        const FADE_START_DELAY = 1500;
        const FADE_DURATION = 500;
        setTimeout(() => {
          setActiveMiniGames((prev) =>
            prev.map((g) =>
              g.id === gameId ? { ...g, isVisuallyRemoving: true } : g
            )
          );
        }, FADE_START_DELAY);
        setTimeout(() => {
          setActiveMiniGames((prev) => prev.filter((g) => g.id !== gameId));
        }, FADE_START_DELAY + FADE_DURATION);
      }
    },
    [address, sessionData, gasEstimateQuery.data, setActiveMiniGames]
  );

  // Manage the auto-click functionality of lumberjacks
  const performAutoClick = useCallback(
    async (lumberjackId: string) => {
      if (isAutoClickProcessingRef.current) {
        console.warn(
          `[AutoClick] Skipped for ${lumberjackId}: Another auto-click is already in progress.`
        );
        return;
      }

      // Ensure transaction prerequisites are met before allowing auto-click
      if (!isTransactionReady) {
        const lumberjack = unlockedLumberjacksRef.current.find(
          (lj) => lj.lumberjackId === lumberjackId
        );
        console.warn(
          `[AutoClick] Transaction prerequisites not met for ${
            lumberjack?.displayName || lumberjackId
          }. Auto-click skipped.`
        );
        return;
      }

      isAutoClickProcessingRef.current = true;
      let gameIdForThisAutoClick: string | undefined; // Defined outside try to be accessible in catch

      try {
        const lumberjack = unlockedLumberjacksRef.current.find(
          (lj) => lj.lumberjackId === lumberjackId
        );

        if (!lumberjack) {
          console.warn(
            `[AutoClick] Lumberjack with ID ${lumberjackId} not found in ref. Skipping autoclick.`
          );
          isAutoClickProcessingRef.current = false;
          return;
        }

        if (
          !address ||
          !sessionData?.privateKey ||
          !gasEstimateQuery.data ||
          nonceQuery.nonce === undefined
        ) {
          console.warn(
            `[AutoClick] Critical data missing despite isTransactionReady=true for lumberjack ${lumberjack.displayName}. This indicates a potential logic flaw. Skipping.`,
            {
              address,
              sessionData,
              gasEstimateQueryData: gasEstimateQuery.data,
              nonce: nonceQuery.nonce,
            }
          );
          isAutoClickProcessingRef.current = false;
          return;
        }

        incrementClickCount();
        const nonceForThisTx = nonceQuery.incrementNonce();

        gameIdForThisAutoClick = uuidv4(); // Assign the ID here
        const newMiniGame: ActiveMiniGame = {
          id: gameIdForThisAutoClick, // Use the generated ID
          character: lumberjack.character,
          initialClickCount: clickCountRef.current ?? 0,
          uiState: "submitting",
          clickTimestamp: Date.now(),
          isVisuallyRemoving: false,
        };
        setActiveMiniGames((prevGames) =>
          [newMiniGame, ...prevGames].slice(0, 50)
        );

        const signer = privateKeyToAccount(sessionData.privateKey);

        const { txHash } = await signClickTx(
          address,
          signer,
          sessionData.session,
          nonceForThisTx,
          gasEstimateQuery.data.gasLimit,
          gasEstimateQuery.data.maxFeePerGas,
          gasEstimateQuery.data.maxPriorityFeePerGas
        );
        setActiveMiniGames((prevGames) =>
          prevGames.map((game) =>
            game.id === gameIdForThisAutoClick // Use the ID for success update
              ? {
                  ...game,
                  txHash: txHash,
                  uiState: "optimistic",
                  optimisticConfirmTimestamp: Date.now(),
                }
              : game
          )
        );
      } catch (error: unknown) {
        console.error("[AutoClick] Error submitting transaction:", error);
        const errorMessage =
          (error instanceof Error ? error.message : String(error)) ||
          "Auto-click transaction failed for an unknown reason.";

        if (gameIdForThisAutoClick) {
          // Check if the ID was assigned
          setActiveMiniGames((prev) =>
            prev.map((g) =>
              g.id === gameIdForThisAutoClick // Use the specific ID for error update
                ? {
                    ...g,
                    uiState: "failed",
                    errorMessage: errorMessage,
                    finalizedTimestamp: Date.now(),
                    isVisuallyRemoving: false,
                  }
                : g
            )
          );
          // Start fade-out process for the failed game
          const FADE_START_DELAY = 1500;
          const FADE_DURATION = 500;
          setTimeout(() => {
            setActiveMiniGames((prev) =>
              prev.map((g) =>
                g.id === gameIdForThisAutoClick
                  ? { ...g, isVisuallyRemoving: true }
                  : g
              )
            );
          }, FADE_START_DELAY);
          setTimeout(() => {
            setActiveMiniGames((prev) =>
              prev.filter((g) => g.id !== gameIdForThisAutoClick)
            );
          }, FADE_START_DELAY + FADE_DURATION);
        } else {
          // This case should ideally not happen if an error occurs after gameId assignment.
          // If error is before, there's no specific mini-game UI element yet to update.
          console.error(
            "[AutoClick] Could not associate error with a specific mini-game ID as it was not set."
          );
          // Optionally, you could try a more generic error display or log, but it won't be tied to a specific game instance.
        }
      } finally {
        isAutoClickProcessingRef.current = false;
      }
    },
    [
      address,
      sessionData,
      gasEstimateQuery.data,
      setActiveMiniGames,
      nonceQuery,
      incrementClickCount,
      isTransactionReady,
    ]
  );

  // Keep performAutoClickRef updated with the latest performAutoClick function
  useEffect(() => {
    performAutoClickRef.current = performAutoClick;
  }, [performAutoClick]);

  // Effect to manage lumberjack autoclick intervals
  useEffect(() => {
    const currentTimers = lumberjackTimersRef.current;
    const activeLumberjackIds = new Set(
      unlockedLumberjacksRef.current.map((lj) => lj.lumberjackId)
    );

    Object.keys(currentTimers).forEach((timerLumberjackId) => {
      if (!activeLumberjackIds.has(timerLumberjackId)) {
        clearInterval(currentTimers[timerLumberjackId]);
        delete currentTimers[timerLumberjackId];
      }
    });

    unlockedLumberjacksRef.current.forEach((lj) => {
      if (currentTimers[lj.lumberjackId]) {
        clearInterval(currentTimers[lj.lumberjackId]);
      }

      const idForThisInterval = lj.lumberjackId;
      const intervalMsForThisInterval = lj.clickIntervalMs;

      currentTimers[idForThisInterval] = setInterval(() => {
        if (performAutoClickRef.current) {
          performAutoClickRef.current(idForThisInterval);
        }
      }, intervalMsForThisInterval);
    });

    return () => {
      Object.values(lumberjackTimersRef.current).forEach((timerId) =>
        clearInterval(timerId)
      );
      lumberjackTimersRef.current = {};
    };
  }, [unlockedLumberjacks]);

  // Effect to determine if transactions are ready
  useEffect(() => {
    const ready =
      !!address &&
      !!sessionData?.privateKey &&
      !!gasEstimateQuery.data &&
      typeof gasEstimateQuery.data.gasLimit !== "undefined" &&
      typeof gasEstimateQuery.data.maxFeePerGas !== "undefined" &&
      typeof gasEstimateQuery.data.maxPriorityFeePerGas !== "undefined" &&
      typeof nonceQuery.nonce !== "undefined";
    setIsTransactionReady(ready);
  }, [address, sessionData, gasEstimateQuery.data, nonceQuery.nonce]);

  const handleGameAreaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const currentLocalClick = localClickCount + 1;
    setLocalClickCount(currentLocalClick);

    // Ensure transaction prerequisites are met
    if (!isTransactionReady) {
      console.warn(
        "[ManualClick] Transaction prerequisites not met. Click ignored."
      );
      // Optionally, provide user feedback here, e.g., a toast message or disable the click area visually
      return;
    }

    // Ensure nonce is initialized before trying to increment it
    if (nonceQuery.nonce === undefined) {
      console.warn(
        "[ManualClick] Nonce is not yet initialized. Please wait and try again."
      );
      // Optionally, provide user feedback here, e.g., a toast message
      return;
    }

    const nonceForThisTx = nonceQuery.incrementNonce();
    incrementClickCount();

    const newMiniGameId = uuidv4();
    const newMiniGame: ActiveMiniGame = {
      id: newMiniGameId,
      character: character,
      initialClickCount: currentLocalClick,
      uiState: "submitting",
      clickTimestamp: Date.now(),
      isVisuallyRemoving: false,
    };
    setActiveMiniGames((prevGames) => [newMiniGame, ...prevGames]);
    submitOptimisticTransaction(newMiniGameId, character, nonceForThisTx);

    const audio = new Audio("/wood-break.mp3");
    audio.play();

    // Emoji burst logic
    const numEmojisToSpawn = 3;
    const newEmojis: BurstingWoodEmoji[] = [];
    for (let i = 0; i < numEmojisToSpawn; i++) {
      newEmojis.push({
        id: uuidv4(),
        x: event.clientX,
        y: event.clientY,
        randomOffsetX: (Math.random() - 0.5) * 150, // Spread distance
        randomOffsetY: (Math.random() - 0.5) * 150, // Spread distance
        randomRotation: (Math.random() - 0.5) * 90, // Random final tilt
      });
    }

    setBurstingWoodEmojis((prevEmojis) => [...prevEmojis, ...newEmojis]);

    setTimeout(() => {
      setBurstingWoodEmojis((prevEmojis) =>
        prevEmojis.filter(
          (emoji) => !newEmojis.some((ne) => ne.id === emoji.id)
        )
      );
    }, 1000); // Animation duration in ms
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4 md:pt-8 z-10">
      {/* Item 1: Dopamine Click Counter */}
      <div className="w-full mb-8 md:mb-14 text-center animate-subtle-grow-shrink">
        <span className="text-xl font-semibold text-[#5a4a1a] mb-2 block">
          Total Clicks
        </span>
        {isClicksLoading ? (
          <span className="text-5xl md:text-7xl font-bold text-[#5a4a1a] opacity-80 inline-block">
            Loading...
          </span>
        ) : (
          <NumberTicker
            value={clickCount || 0}
            className={`mt-2 text-5xl md:text-7xl font-bold text-[#5a4a1a] transition-transform duration-300 ease-out inline-block ${
              pulseClickCount ? "scale-125" : "scale-100"
            }`}
          />
        )}
      </div>

      <div className="flex flex-col md:flex-row w-full gap-x-8 gap-y-4 items-start">
        {/* Left Column: Click Area, Info, and Controls */}
        <div
          ref={leftColumnRef}
          className="flex flex-col gap-6 w-full md:w-1/2 order-1"
        >
          {" "}
          {/* order-1 for mobile and md */}
          {/* Item 2: Click Area (Moved Here) */}
          <div className="relative">
            {" "}
            {/* New wrapper for Pointer to target */}
            <Pointer>
              <span style={{ fontSize: "64px" }}>🪓</span>
            </Pointer>
            <div
              id="mini-game-spawn-area"
              onPointerDown={handleGameAreaClick}
              className={`${styles.gameFrame} relative w-full h-50 md:h-70 flex items-center justify-center cursor-pointer bg-green-100 hover:bg-green-200 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 overflow-hidden`}
            >
              <Ripple />
              <span className="text-2xl font-bold text-green-700 select-none z-10 text-center">
                CLICK TO CHOP!
              </span>
            </div>
          </div>
          {/* Item 2: Your Wallet Info (Moved Here) */}
          <div
            className={`${styles.gameFrameThin} min-h-[72px] flex flex-row items-center gap-4 w-full`}
          >
            <Image
              src="/abs.svg"
              alt="Abstract Wallet"
              width={36}
              height={36}
              className="flex-shrink-0"
              style={{
                filter: "invert(0) brightness(0)",
              }}
            />
            <div className="flex flex-col flex-1 min-w-0 justify-center">
              <span className="font-bold text-[#5a4a1a] text-sm sm:text-md leading-none mb-1">
                Your Wallet
              </span>
              <span className="flex items-center gap-1.5">
                {address ? (
                  <a
                    href={`${chain.blockExplorers?.default.url}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[#5a4a1a] opacity-85 underline transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-[180px] md:max-w-[220px] hover:opacity-100 text-xs sm:text-sm"
                    title="View on abscan.org"
                  >
                    {`${address.slice(0, 6)}...${address.slice(-4)}`}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="ml-1 opacity-70"
                    >
                      <path
                        d="M5 11L11 5"
                        stroke="#5a4a1a"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M7.5 5H11V8.5"
                        stroke="#5a4a1a"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                ) : (
                  "Not connected"
                )}
              </span>
            </div>
          </div>
          {/* Axe Selection (Remains Here) */}
          <div className="w-full mt-2">
            {" "}
            {/* Adjusted margin from mt-4 */}
            <h3 className="font-bold text-[#5a4a1a] text-base mb-2">
              Unlocked Lumberjacks
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LUMBERJACK_TIERS.map((tier) => {
                const isUnlocked = unlockedLumberjacks.some(
                  (lj) => lj.id === tier.id
                );
                const lumberjackInstance = unlockedLumberjacks.find(
                  (lj) => lj.id === tier.id
                );
                return (
                  <div
                    key={tier.id}
                    className={`
                      relative p-2 border-4 rounded-lg flex flex-col items-center
                      ${
                        isUnlocked
                          ? "border-[#a86b2d] bg-[#d4e0a0]"
                          : "border-[#aaa] bg-[#ddd] opacity-50 cursor-not-allowed"
                      }
                    `}
                  >
                    {isUnlocked && lumberjackInstance ? (
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-1 flex items-center justify-center">
                        <LumberjackDisplayCard
                          character={lumberjackInstance.character}
                          canvasSize={48}
                        />
                      </div>
                    ) : (
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-1 flex items-center justify-center opacity-50">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-10 h-10 text-gray-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                          />
                        </svg>
                      </div>
                    )}
                    <span className="text-xs sm:text-sm text-[#5a4a1a] font-medium text-center">
                      {tier.displayName}
                    </span>
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-md">
                        <div className="bg-[#5a4a1a] text-white px-2 py-1 rounded text-xs text-center">
                          Unlocks at {tier.unlockThreshold}
                        </div>
                      </div>
                    )}
                    {isUnlocked && (
                      <span className="text-xs text-[#5a4a1a] opacity-80 mt-1">
                        {`${(60000 / tier.clickIntervalMs).toFixed(1)}/min`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Miners List */}
        {/* order-2 for mobile and md */}
        <div className="flex flex-col w-full md:w-1/2 order-2">
          {/* Item 4: Miners Container taking full available height based on JS */}
          <div
            ref={rightScrollableContentRef}
            className="flex-1 w-full flex flex-col gap-2 p-1 rounded-lg min-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-700 scrollbar-track-amber-200/50"
          >
            {activeMiniGames.map((game) => (
              // Item 5: Wrapper for fade-out
              <div
                key={game.id}
                className={`transition-opacity duration-500 ease-in-out ${
                  game.isVisuallyRemoving ? "opacity-0" : "opacity-100"
                }`}
              >
                <MiniMiningInstance
                  character={game.character}
                  uiState={game.uiState}
                  errorMessage={game.errorMessage}
                  clickTimestamp={game.clickTimestamp}
                  optimisticConfirmTimestamp={game.optimisticConfirmTimestamp}
                  finalizedTimestamp={game.finalizedTimestamp}
                  blockExplorerBaseUrl={chain.blockExplorers?.default.url}
                  instanceCanvasSize={64}
                  txHash={game.txHash}
                />
                {game.txHash &&
                  (game.uiState === "optimistic" ||
                    game.uiState === "submitting") &&
                  !game.isVisuallyRemoving && ( // Hide monitor when fading
                    <TransactionMonitor
                      key={`monitor-${game.id}`}
                      txHash={game.txHash}
                      chainId={chain.id}
                      onCompletion={(success) => {
                        const gameIdToUpdate = game.id;
                        const FADE_START_DELAY = 1500; // Time to show confirmed/failed status
                        const FADE_DURATION = 500; // CSS animation duration

                        setActiveMiniGames((prev) =>
                          prev.map((g) => {
                            if (g.id === gameIdToUpdate) {
                              return {
                                ...g,
                                uiState: success ? "confirmed" : "failed",
                                finalizedTimestamp: Date.now(),
                                isVisuallyRemoving: false, // Reset in case it was pre-failed
                              };
                            }
                            return g;
                          })
                        );

                        // Start fade-out process
                        setTimeout(() => {
                          setActiveMiniGames((prev) =>
                            prev.map((g) =>
                              g.id === gameIdToUpdate
                                ? { ...g, isVisuallyRemoving: true }
                                : g
                            )
                          );
                        }, FADE_START_DELAY);

                        // Remove from DOM after fade
                        setTimeout(() => {
                          setActiveMiniGames((prev) =>
                            prev.filter((g) => g.id !== gameIdToUpdate)
                          );
                        }, FADE_START_DELAY + FADE_DURATION);
                      }}
                    />
                  )}
              </div>
            ))}
            {activeMiniGames.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-center text-[#5a4a1a]/70 p-4">
                <p className="text-lg">
                  No trees felled yet! Get to choppin&apos; by clicking
                  &apos;CLICK TO CHOP!&apos;
                  <br />
                  Your mighty swings (transactions) will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>
        {`
          @keyframes subtle-grow-shrink {
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.03);
            }
          }
          .animate-subtle-grow-shrink {
            animation: subtle-grow-shrink 3s infinite ease-in-out;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-thin::-webkit-scrollbar {
            height: 8px;
            width: 8px;
          }
          .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb {
            background-color: #b45309;
            border-radius: 4px;
          }
          .scrollbar-track-amber-200\/50::-webkit-scrollbar-track {
            background-color: rgba(253, 230, 138, 0.5);
            border-radius: 4px;
          }

          /* New styles for wood burst effect */
          .wood-burst-emoji {
            /* Apply initial transform to center emoji on cursor */
            transform: translate(-50%, -50%);
            animation: burstOutEffect 1s ease-out forwards;
            will-change: transform, opacity; /* Hint for browser optimization */
          }

          @keyframes burstOutEffect {
            0% {
              transform: translate(-50%, -50%) scale(1.2); /* Start centered and slightly larger */
              opacity: 1;
            }
            100% {
              /* Move to offset, shrink, rotate, and fade out */
              transform: translate(
                  calc(-50% + var(--offsetX)),
                  calc(-50% + var(--offsetY))
                )
                scale(0.3) rotate(var(--rotation));
              opacity: 0;
            }
          }
        `}
      </style>
      {/* Render bursting wood emojis */}
      {burstingWoodEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className="wood-burst-emoji"
          style={{
            position: "fixed",
            left: `${emoji.x}px`,
            top: `${emoji.y}px`,
            pointerEvents: "none",
            zIndex: 9999, // Ensure emojis are on top
            fontSize: "24px", // Size of the emoji
            // CSS variables for dynamic animation properties
            // @ts-expect-error YOLO
            ["--offsetX"]: `${emoji.randomOffsetX}px`,
            ["--offsetY"]: `${emoji.randomOffsetY}px`,
            ["--rotation"]: `${emoji.randomRotation}deg`,
          }}
        >
          🪵
        </div>
      ))}
    </div>
  );
}

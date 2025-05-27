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
import { v4 as uuidv4 } from "uuid";

// Types for weapon selection
type AxeType =
  | "axe"
  | "axe_copper"
  | "axe_silver"
  | "axe_gold"
  | "axe_blue"
  | "axe_pink";

// Axe unlock thresholds
const AXE_UNLOCK_THRESHOLDS: Record<AxeType, number> = {
  axe: 0,
  axe_copper: 500,
  axe_silver: 1000,
  axe_gold: 5000,
  axe_blue: 10000,
  axe_pink: 100000,
};

// Axe display names
const AXE_DISPLAY_NAMES: Record<AxeType, string> = {
  axe: "Basic Axe",
  axe_copper: "Copper Axe",
  axe_silver: "Silver Axe",
  axe_gold: "Gold Axe",
  axe_blue: "Blue Axe",
  axe_pink: "Pink Axe",
};

// Data structure for active mini-games
interface ActiveMiniGame {
  id: string;
  character: Character;
  selectedAxe: AxeType;
  initialClickCount: number;
  txHash?: `0x${string}`;
  uiState: "submitting" | "optimistic" | "confirmed" | "failed";
  clickTimestamp: number;
  optimisticConfirmTimestamp?: number;
  finalizedTimestamp?: number;
  isVisuallyRemoving?: boolean; // For fade-out effect
}

export default function MiningGame({
  character: initialCharacter,
}: {
  character?: Character;
}) {
  const { address } = useAccount();
  const { data: sessionData } = useAbstractSession();
  const {
    clickCount,
    isLoading: isClicksLoading,
    incrementClickCount,
  } = useUserClicks();

  const [character, setCharacter] = useState(
    () => initialCharacter || generateRandomCharacter()
  );
  const [selectedAxe, setSelectedAxe] = useState<AxeType>("axe");
  const [localClickCount, setLocalClickCount] = useState(0);
  const [activeMiniGames, setActiveMiniGames] = useState<ActiveMiniGame[]>([]);

  const [pulseClickCount, setPulseClickCount] = useState(false);

  // Refs for height synchronization
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightScrollableContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof clickCount === "number" && clickCount > 0 && !isClicksLoading) {
      setPulseClickCount(true);
      const timer = setTimeout(() => setPulseClickCount(false), 300); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [clickCount, isClicksLoading]);

  useEffect(() => {
    const synchronizeHeights = () => {
      if (leftColumnRef.current && rightScrollableContentRef.current) {
        const leftColumnHeight = leftColumnRef.current.offsetHeight;
        rightScrollableContentRef.current.style.maxHeight = `${leftColumnHeight}px`;
      }
    };

    synchronizeHeights(); // Initial sync

    // Optional: Re-sync if activeMiniGames length changes, as this could affect left column height (though less likely with current fixed content)
    // This might be too frequent if many games are added/removed quickly.
    // A ResizeObserver on the left column would be more performant for dynamic content changes in left col.

    window.addEventListener("resize", synchronizeHeights);
    return () => {
      window.removeEventListener("resize", synchronizeHeights);
    };
  }, [activeMiniGames.length]); // Re-run if the number of games changes, or on mount/unmount

  const handleGameAreaClick = () => {
    const currentLocalClick = localClickCount + 1;
    setLocalClickCount(currentLocalClick);

    const newMiniGameId = uuidv4();
    const newMiniGame: ActiveMiniGame = {
      id: newMiniGameId,
      character: character,
      selectedAxe: selectedAxe,
      initialClickCount: currentLocalClick,
      uiState: "submitting",
      clickTimestamp: Date.now(),
      isVisuallyRemoving: false,
    };
    setActiveMiniGames((prevGames) => [newMiniGame, ...prevGames]);
    submitOptimisticTransaction(newMiniGameId);
    nonceQuery.incrementNonce();
    incrementClickCount();

    const audio = new Audio("/wood-break.mp3");
    audio.play();
  };

  const gasEstimateQuery = useClickGasEstimate();
  const nonceQuery = useTransactionNonce();

  async function submitOptimisticTransaction(gameId: string) {
    if (
      !address ||
      !sessionData?.privateKey ||
      !gasEstimateQuery.data ||
      !nonceQuery.nonce
    ) {
      console.error("Transaction pre-requisites not met");
      setActiveMiniGames((prev) =>
        prev.map((g) =>
          g.id === gameId
            ? {
                ...g,
                uiState: "failed",
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
    const signer = privateKeyToAccount(sessionData.privateKey);
    try {
      const { txHash } = await signClickTx(
        address,
        signer,
        sessionData.session,
        nonceQuery.nonce
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
      setActiveMiniGames((prev) =>
        prev.map((g) =>
          g.id === gameId
            ? {
                ...g,
                uiState: "failed",
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
  }

  const isAxeUnlocked = (axeType: AxeType): boolean => {
    if (!clickCount) return axeType === "axe";
    return clickCount >= AXE_UNLOCK_THRESHOLDS[axeType];
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4 md:pt-8 z-10">
      {/* Item 1: Dopamine Click Counter */}
      <div className="w-full mb-14 text-center animate-subtle-grow-shrink">
        <span className="text-xl font-semibold text-[#5a4a1a] mb-2 block">
          Total Clicks
        </span>
        {isClicksLoading ? (
          <span className="text-7xl font-bold text-[#5a4a1a] opacity-80">
            Loading...
          </span>
        ) : (
          <NumberTicker
            value={clickCount || 0}
            className={`mt-2 text-7xl font-bold text-[#5a4a1a] transition-transform duration-300 ease-out ${
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
          <div
            id="mini-game-spawn-area"
            onClick={handleGameAreaClick}
            className={`${styles.gameFrame} w-full h-50 md:h-70 flex items-center justify-center cursor-pointer bg-green-100 hover:bg-green-200 transition-colors`}
          >
            <span className="text-2xl font-bold text-green-700 select-none">
              CLICK TO MINE!
            </span>
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
              <span className="font-bold text-[#5a4a1a] text-md leading-none mb-1">
                Your Wallet
              </span>
              <span className="flex items-center gap-1.5">
                {address ? (
                  <a
                    href={`${chain.blockExplorers?.default.url}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[#5a4a1a] opacity-85 underline transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[220px] hover:opacity-100"
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
              Select Axe
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(AXE_DISPLAY_NAMES) as AxeType[]).map((axeType) => (
                <button
                  key={axeType}
                  onClick={() => setSelectedAxe(axeType)}
                  disabled={!isAxeUnlocked(axeType)}
                  className={`
                    relative p-2 border-4 rounded-lg transition-all flex flex-col items-center
                    ${
                      selectedAxe === axeType
                        ? "border-[#a86b2d] bg-[#d4e0a0]"
                        : isAxeUnlocked(axeType)
                        ? "border-[#ccc4a1] bg-[#e0e0b2] hover:bg-[#d4e0a0] hover:border-[#a86b2d]"
                        : "border-[#aaa] bg-[#ddd] opacity-50 cursor-not-allowed"
                    }
                  `}
                >
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-1 flex items-center justify-center">
                    <div
                      className="w-[32px] h-[32px] transform scale-[2.5] sm:scale-[3.125] translate-x-[-6px] sm:translate-x-[-8px] translate-y-[6px] sm:translate-y-[8px]"
                      style={{
                        backgroundImage: `url(/animations/axe/e-tool/${axeType}.png)`,
                        backgroundPosition: `-32px -64px`,
                        backgroundSize: `160px 128px`,
                        imageRendering: "pixelated",
                      }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm text-[#5a4a1a] font-medium">
                    {AXE_DISPLAY_NAMES[axeType]}
                  </span>
                  {!isAxeUnlocked(axeType) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-md">
                      <div className="bg-[#5a4a1a] text-white px-2 py-1 rounded text-xs text-center">
                        Unlocks at {AXE_UNLOCK_THRESHOLDS[axeType]}
                      </div>
                    </div>
                  )}
                </button>
              ))}
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
                  id={game.id}
                  character={game.character}
                  selectedAxe={game.selectedAxe}
                  initialClickCount={game.initialClickCount}
                  uiState={game.uiState}
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
                  &apos;CLICK TO MINE!&apos;
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
          .scrollbar-track-amber-200\\/50::-webkit-scrollbar-track {
            background-color: rgba(253, 230, 138, 0.5);
            border-radius: 4px;
          }
        `}
      </style>
    </div>
  );
}

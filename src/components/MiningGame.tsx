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
            ? { ...g, uiState: "failed", finalizedTimestamp: Date.now() }
            : g
        )
      );
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
            ? { ...g, uiState: "failed", finalizedTimestamp: Date.now() }
            : g
        )
      );
    }
  }

  const isAxeUnlocked = (axeType: AxeType): boolean => {
    if (!clickCount) return axeType === "axe";
    return clickCount >= AXE_UNLOCK_THRESHOLDS[axeType];
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4 md:pt-8 z-10">
      <div className="flex flex-col md:flex-row w-full gap-x-8 gap-y-4 items-start">
        {/* Left Column: Info and Controls */}
        <div className="flex flex-col gap-4 w-full md:w-1/2 order-2 md:order-1">
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
          <div
            className={`${styles.gameFrameThin} min-h-[72px] flex flex-row items-center gap-4 p-5 w-full`}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              {/* Trunk */}
              <rect x="16" y="27" width="4" height="6" rx="1" fill="#a86b2d" />
              {/* Tree layers */}
              <polygon
                points="18,5 8,20 28,20"
                fill="#bfc98a"
                stroke="#a86b2d"
                strokeWidth="2"
              />
              <polygon
                points="18,11 12,22 24,22"
                fill="#bfc98a"
                stroke="#a86b2d"
                strokeWidth="2"
              />
              <polygon
                points="18,17 15,25 21,25"
                fill="#bfc98a"
                stroke="#a86b2d"
                strokeWidth="2"
              />
            </svg>
            <div className="flex flex-col flex-1 min-w-0 justify-center gap-1">
              <span className="font-bold text-[#5a4a1a] text-md leading-none">
                You&rsquo;ve Clicked
              </span>
              <span className="flex items-end gap-1 text-[#5a4a1a] text-base opacity-85 mt-0.5 min-w-[60px]">
                {isClicksLoading ? (
                  "Loading..."
                ) : (
                  <>
                    <NumberTicker
                      value={clickCount || 0}
                      className="text-2xl font-bold"
                    />
                    <span className="text-xs text-[#5a4a1a] opacity-60 mb-1 leading-none">
                      times
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={() => setCharacter(generateRandomCharacter())}
            className="w-full min-h-[48px] flex items-center gap-4 p-3 text-left transition-colors bg-[#bfc98a] border-4 border-[#a86b2d] rounded-[32px] shadow-[12px_16px_32px_0_rgba(80,40,10,0.35)] relative cursor-pointer mt-2 hover:bg-[#d4e0a0] hover:border-[#8b5a2b] hover:shadow-[8px_12px_24px_0_rgba(80,40,10,0.25)]"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path
                d="M18 6C11.373 6 6 11.373 6 18C6 24.627 11.373 30 18 30C24.627 30 30 24.627 30 18C30 11.373 24.627 6 18 6ZM18 28C12.477 28 8 23.523 8 18C8 12.477 12.477 8 18 8C23.523 8 28 12.477 28 18C28 23.523 23.523 28 18 28Z"
                fill="#5a4a1a"
              />
              <path
                d="M18 12C17.448 12 17 12.448 17 13V17H13C12.448 17 12 17.448 12 18C12 18.552 12.448 19 13 19H17V23C17 23.552 17.448 24 18 24C18.552 24 19 23.552 19 23V19H23C23.552 19 24 18.552 24 18C24 17.448 23.552 17 23 17H19V13C19 12.448 18.552 12 18 12Z"
                fill="#5a4a1a"
              />
            </svg>
            <span className="font-bold text-[#5a4a1a] text-base">
              Generate New Character
            </span>
          </button>
          <div className="w-full mt-4">
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

        {/* Right Column: Click Area and Miners */}
        <div className="flex flex-col gap-6 w-full md:w-1/2 order-1 md:order-2">
          {/* Click Area */}
          <div
            id="mini-game-spawn-area"
            onClick={handleGameAreaClick}
            className={`${styles.gameFrame} w-full h-50 md:h-70 flex items-center justify-center cursor-pointer bg-green-100 hover:bg-green-200 transition-colors`}
          >
            <span className="text-2xl font-bold text-green-700 select-none">
              CLICK TO MINE!
            </span>
          </div>

          {/* Miners Container: Adjust max-h for 5 items */}
          <div className="w-full flex flex-col gap-2 p-1 rounded-lg min-h-[80px] max-h-[368px] overflow-y-scroll scrollbar-thin scrollbar-thumb-amber-700 scrollbar-track-amber-200/50">
            {activeMiniGames.map((game) => (
              <React.Fragment key={game.id}>
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
                    game.uiState === "submitting") && (
                    <TransactionMonitor
                      key={`monitor-${game.id}`}
                      txHash={game.txHash}
                      chainId={chain.id}
                      onCompletion={(success) => {
                        setActiveMiniGames((prev) =>
                          prev.map((g) => {
                            if (g.id === game.id) {
                              return {
                                ...g,
                                uiState: success ? "confirmed" : "failed",
                                finalizedTimestamp: Date.now(),
                              };
                            }
                            return g;
                          })
                        );
                      }}
                    />
                  )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <style>
        {`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } 
                .scrollbar-thin::-webkit-scrollbar { height: 8px; width: 8px; } 
                .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb { background-color: #b45309; border-radius: 4px;} 
                .scrollbar-track-amber-200\/50::-webkit-scrollbar-track { background-color: rgba(253, 230, 138, 0.5); border-radius: 4px; }`}
      </style>
    </div>
  );
}

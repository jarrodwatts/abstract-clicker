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
import { AnimatedList } from "./magicui/animated-list";
import { v4 as uuidv4 } from "uuid";

// Types for weapon selection
type AxeType =
  | "axe"
  | "axe_wood"
  | "axe_copper"
  | "axe_silver"
  | "axe_gold"
  | "axe_blue"
  | "axe_pink";

// Axe unlock thresholds
const AXE_UNLOCK_THRESHOLDS: Record<AxeType, number> = {
  axe: 0,
  axe_wood: 100,
  axe_copper: 500,
  axe_silver: 1000,
  axe_gold: 5000,
  axe_blue: 10000,
  axe_pink: 100000,
};

// Axe display names
const AXE_DISPLAY_NAMES: Record<AxeType, string> = {
  axe: "Basic Axe",
  axe_wood: "Wood Axe",
  axe_copper: "Copper Axe",
  axe_silver: "Silver Axe",
  axe_gold: "Gold Axe",
  axe_blue: "Blue Axe",
  axe_pink: "Pink Axe",
};

// Data structure for active mini-games
interface ActiveMiniGame {
  id: string;
  character: Character; // Character state at the time of click
  selectedAxe: AxeType; // Axe state at the time of click
  initialClickCount: number; // click count for animation speed
  txHash?: `0x${string}`; // Transaction hash, optional initially
  status?: "pending" | "complete"; // To track if we are already monitoring/completed
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
  const [transactions, setTransactions] = useState<
    Array<{ hash: `0x${string}`; timeTaken: number }>
  >([]);

  const handleGameAreaClick = () => {
    const currentLocalClick = localClickCount + 1;
    setLocalClickCount(currentLocalClick);

    const newMiniGameId = uuidv4(); // Generate unique ID once
    const newMiniGame: ActiveMiniGame = {
      id: newMiniGameId,
      character: character,
      selectedAxe: selectedAxe,
      initialClickCount: currentLocalClick,
      status: "pending",
    };
    setActiveMiniGames((prevGames) => [...prevGames, newMiniGame]);

    // Pass newMiniGameId to submitOptimisticTransaction so it can update the specific game
    submitOptimisticTransaction(newMiniGameId);
    nonceQuery.incrementNonce();
    incrementClickCount();

    const audio = new Audio("/wood-break.mp3");
    audio.play();
  };

  const handleMiniGameComplete = useCallback((idToRemove: string) => {
    setActiveMiniGames((prevGames) =>
      prevGames.filter((game) => game.id !== idToRemove)
    );
  }, []);

  const gasEstimateQuery = useClickGasEstimate();
  const nonceQuery = useTransactionNonce();

  async function submitOptimisticTransaction(gameId: string) {
    // Accept gameId
    if (!address) throw new Error("No AGW address found");
    if (!sessionData?.privateKey) throw new Error("No session signer found");
    if (!gasEstimateQuery.data) throw new Error("No gas estimate found");
    if (!nonceQuery.nonce) throw new Error("No nonce found");

    const signer = privateKeyToAccount(sessionData.privateKey);

    const { txHash, timeTaken } = await signClickTx(
      address,
      signer,
      sessionData.session,
      nonceQuery.nonce
    );

    // Update the specific mini-game instance with its transaction hash
    setActiveMiniGames((prevGames) =>
      prevGames.map((game) =>
        game.id === gameId ? { ...game, txHash: txHash } : game
      )
    );

    setTransactions((prev) =>
      [
        {
          hash: txHash,
          timeTaken,
        },
        ...prev,
      ].slice(0, 10)
    );
  }

  const isAxeUnlocked = (axeType: AxeType): boolean => {
    if (!clickCount) return axeType === "axe";
    return clickCount >= AXE_UNLOCK_THRESHOLDS[axeType];
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4 mt:8 md:mt-12 z-10">
      <div className="flex flex-col md:flex-row w-full gap-y-4 md:gap-y-0 md:gap-x-16 items-start">
        <div className="flex flex-col items-center w-full md:w-1/2 gap-1 order-1 md:order-none">
          <div
            id="mini-game-spawn-area"
            className={`${styles.gameFrame} w-full min-h-[100px] flex flex-row flex-wrap gap-2 p-2 justify-center items-center cursor-pointer`}
            onClick={handleGameAreaClick}
          >
            {activeMiniGames.length === 0 && (
              <div className="text-center text-gray-500 p-4">
                Click here to start mining!
              </div>
            )}
            {activeMiniGames.map((game) => (
              <MiniMiningInstance
                key={game.id}
                id={game.id}
                character={game.character}
                selectedAxe={game.selectedAxe}
                initialClickCount={game.initialClickCount}
                onComplete={handleMiniGameComplete}
                instanceCanvasSize={64}
              />
            ))}
            {activeMiniGames.map((game) => {
              if (game.txHash && game.status === "pending") {
                return (
                  <TransactionMonitor
                    key={`monitor-${game.id}`}
                    txHash={game.txHash}
                    chainId={chain.id}
                    onCompletion={() => {
                      setActiveMiniGames((prev) =>
                        prev.map((g) =>
                          g.id === game.id ? { ...g, status: "complete" } : g
                        )
                      );
                      handleMiniGameComplete(game.id);
                    }}
                  />
                );
              }
              return null;
            })}
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
            <div className="grid grid-cols-3 gap-2">
              {(["axe_wood", "axe_copper", "axe_silver"] as AxeType[]).map(
                (axeType) => (
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
                    <div className="relative w-16 h-16 mb-1 flex items-center justify-center">
                      <div
                        className="w-[32px] h-[32px] transform scale-[3.125] translate-x-[-8px] translate-y-[8px]"
                        style={{
                          backgroundImage: `url(/animations/axe/e-tool/${axeType}.png)`,
                          backgroundPosition: `-32px -64px`,
                          backgroundSize: `160px 128px`,
                          imageRendering: "pixelated",
                        }}
                      />
                    </div>
                    <span className="text-sm text-[#5a4a1a] font-medium">
                      {AXE_DISPLAY_NAMES[axeType]}
                    </span>
                    {!isAxeUnlocked(axeType) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-md">
                        <div className="bg-[#5a4a1a] text-white px-2 py-1 rounded text-xs">
                          Unlocks at {AXE_UNLOCK_THRESHOLDS[axeType]} clicks
                        </div>
                      </div>
                    )}
                  </button>
                )
              )}
              {(["axe_gold", "axe_blue", "axe_pink"] as AxeType[]).map(
                (axeType) => (
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
                    <div className="relative w-16 h-16 mb-1 flex items-center justify-center">
                      <div
                        className="w-[32px] h-[32px] transform scale-[3.125] translate-x-[-8px] translate-y-[2px]"
                        style={{
                          backgroundImage: `url(/animations/axe/e-tool/${axeType}.png)`,
                          backgroundPosition: `-32px -64px`,
                          backgroundSize: `160px 128px`,
                          imageRendering: "pixelated",
                        }}
                      />
                    </div>
                    <span className="text-sm text-[#5a4a1a] font-medium">
                      {AXE_DISPLAY_NAMES[axeType]}
                    </span>
                    {!isAxeUnlocked(axeType) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-md">
                        <div className="bg-[#5a4a1a] text-white px-2 py-1 rounded text-xs">
                          Unlocks at {AXE_UNLOCK_THRESHOLDS[axeType]} clicks
                        </div>
                      </div>
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 w-full md:w-1/2 order-2 md:order-none">
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
                Your Abstract Global Wallet
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
                      decimalPlaces={0}
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
          <div
            className={`${styles.gameFrameThin} h-[478px] p-5 flex flex-col justify-start w-full`}
          >
            <h3 className="text-md font-semibold mb-4 text-[#5a4a1a]">
              Recent Transactions
            </h3>
            <div className="flex items-center justify-between px-3 pb-4 text-[#5a4a1a] font-semibold text-[14px] border-b border-[#e0e0b2] mb-2">
              <span>Hash</span>
              <span className="flex items-center gap-1">
                <span role="img" aria-label="stopwatch">
                  ⏱️
                </span>
                Time Taken
              </span>
            </div>
            <div className="max-h-[340px] min-h-[200px] overflow-y-auto hide-scrollbar">
              <AnimatedList>
                {transactions.map((tx) => (
                  <a
                    key={tx.hash}
                    href={`${chain.blockExplorers?.default.url}/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 hover:bg-[#f5f5e6] rounded-lg transition-colors text-[#5a4a1a]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">
                        {`${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`}
                      </span>
                      <span className="text-sm opacity-70 flex items-center gap-1">
                        <span role="img" aria-label="stopwatch">
                          ⏱️
                        </span>{" "}
                        {tx.timeTaken.toFixed(0)}ms
                      </span>
                    </div>
                  </a>
                ))}
              </AnimatedList>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

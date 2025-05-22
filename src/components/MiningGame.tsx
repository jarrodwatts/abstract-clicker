"use client";

import React, { useEffect, useRef, useState } from "react";
import { NatureTileName, renderNatureTile } from "@/utils/natureImages";
import AnimationPreview from "@/components/AnimationPreview";
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

// Types for leaf particle animation
type Leaf = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  type: string;
  opacity: number;
  gravity: number;
};

// Available leaf types for animation
const LEAF_TYPES = [
  "Apple Tree Leaf",
  "Orange Tree Leaf",
  "Birch Tree Leaf",
  "Pine Tree Leaf",
  "Pear Tree Leaf",
];

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [character, setCharacter] = useState(
    () => initialCharacter || generateRandomCharacter()
  );
  const [selectedAxe, setSelectedAxe] = useState<AxeType>("axe");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Leaf animation system
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  // Tree animation state
  const [treeScale, setTreeScale] = useState(1);
  const [treeAnimationTrigger, setTreeAnimationTrigger] = useState(0);
  const treeAnimationRef = useRef<number | null>(null);

  // Local click count for animation speed
  const [localClickCount, setLocalClickCount] = useState(0);

  // Transaction feed state
  const [transactions, setTransactions] = useState<
    Array<{ hash: `0x${string}`; timeTaken: number }>
  >([]);

  // Render everything
  useEffect(() => {
    const renderCanvas = async () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      // Clear the canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Draw the tree with current scale
      // Save context, apply scaling transformation centered on tree, then restore
      ctx.save();

      // Scale from the center of the canvas
      const centerX = canvasRef.current.width / 2;
      const centerY = canvasRef.current.height / 2;

      ctx.translate(centerX, centerY);
      ctx.scale(treeScale, treeScale);
      ctx.translate(-centerX, -centerY);

      // Draw the tree centered in the canvas
      const offsetX = (canvasRef.current.width - 240) / 2;
      const offsetY = (canvasRef.current.height - 240) / 2;
      await renderNatureTile(ctx, "Apple Tree", offsetX, offsetY, 240, 240);

      ctx.restore();

      // Draw all active leaves on top of the tree
      for (const leaf of leaves) {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation);
        ctx.scale(leaf.scale, leaf.scale);
        ctx.globalAlpha = leaf.opacity;
        await renderNatureTile(
          ctx,
          leaf.type as NatureTileName,
          -15,
          -15,
          30,
          30
        );
        ctx.restore();
      }
    };

    renderCanvas();
  }, [treeScale, leaves]);

  // Tree animation system
  useEffect(() => {
    // Cancel any existing animation
    if (treeAnimationRef.current) {
      cancelAnimationFrame(treeAnimationRef.current);
    }

    // Reset tree scale to 1 at the start
    setTreeScale(1);

    // Don't animate if trigger is 0 (initial state)
    if (treeAnimationTrigger === 0) return;

    const ANIMATION_DURATION = 30; // frames
    const MAX_SCALE = 1.15;
    let frame = 0;
    let growing = true;

    const animateTree = () => {
      frame++;

      if (growing) {
        // Growing phase (0 to MAX_SCALE)
        const progress = Math.min(1, frame / ANIMATION_DURATION);
        setTreeScale(1 + (MAX_SCALE - 1) * progress);

        if (frame >= ANIMATION_DURATION) {
          growing = false;
          frame = 0;
        }
      } else {
        // Shrinking phase (MAX_SCALE to 1)
        const progress = Math.min(1, frame / ANIMATION_DURATION);
        setTreeScale(1 + (MAX_SCALE - 1) * (1 - progress));

        if (frame >= ANIMATION_DURATION) {
          setTreeScale(1);
          return;
        }
      }

      treeAnimationRef.current = requestAnimationFrame(animateTree);
    };

    // Start the animation immediately
    treeAnimationRef.current = requestAnimationFrame(animateTree);

    return () => {
      if (treeAnimationRef.current) {
        cancelAnimationFrame(treeAnimationRef.current);
      }
    };
  }, [treeAnimationTrigger]);

  // Update leaf positions every animation frame
  useEffect(() => {
    if (leaves.length === 0) return;

    const updateLeafParticles = () => {
      setLeaves((prevLeaves) => {
        // Update each leaf's position and properties
        const updatedLeaves = prevLeaves.map((leaf) => ({
          ...leaf,
          x: leaf.x + leaf.velocityX,
          y: leaf.y + leaf.velocityY,
          rotation: leaf.rotation + leaf.angularVelocity,
          velocityX: leaf.velocityX * 0.95, // Apply air resistance
          velocityY: (leaf.velocityY + leaf.gravity) * 0.95, // Apply gravity and air resistance
          opacity: leaf.opacity * 0.99, // Fade out gradually
        }));

        // Remove leaves that are out of view or fully transparent
        return updatedLeaves.filter(
          (leaf) =>
            leaf.opacity > 0.1 &&
            leaf.x > -50 &&
            leaf.x < canvasRef.current!.width + 50 &&
            leaf.y > -50 &&
            leaf.y < canvasRef.current!.height + 50
        );
      });

      // Continue animation loop if there are still leaves
      if (leaves.length > 0) {
        animationFrameIdRef.current =
          requestAnimationFrame(updateLeafParticles);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(updateLeafParticles);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [leaves]);

  // Create new leaf particles on click
  const createLeafBurst = () => {
    // Get the center of the tree (canvas)
    const canvasWidth = canvasRef.current?.width || 320;
    const canvasHeight = canvasRef.current?.height || 320;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Create 5-8 leaves with random properties (reduced from 8-12)
    const numLeaves = 5 + Math.floor(Math.random() * 4);
    const newLeaves: Leaf[] = [];

    for (let i = 0; i < numLeaves; i++) {
      // Random angle for the burst direction
      const angle = Math.random() * Math.PI * 2;

      // Random speed between 4-8
      const speed = 4 + Math.random() * 4;

      // Create the leaf particle
      newLeaves.push({
        x: centerX,
        y: centerY,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.3 + Math.random() * 0.3,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        angularVelocity: (Math.random() - 0.5) * 0.2,
        type: LEAF_TYPES[Math.floor(Math.random() * LEAF_TYPES.length)],
        opacity: 0.8 + Math.random() * 0.2,
        gravity: 0.05 + Math.random() * 0.05,
      });
    }

    // Add new leaves to the existing ones
    setLeaves((prevLeaves) => [...prevLeaves, ...newLeaves]);
  };

  const handleCanvasClick = () => {
    // Increment click counter for animation speed scaling
    setIsAnimating(true);
    setLocalClickCount((prev) => prev + 1);

    // Create the leaf burst effect
    createLeafBurst();

    // Trigger tree animation by incrementing the trigger counter
    setTreeAnimationTrigger((prev) => prev + 1);

    submitOptimisticTransaction();
    nonceQuery.incrementNonce();
    incrementClickCount();

    // Play wood.wav audio
    const audio = new Audio("/wood-break.mp3");
    audio.play();

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      timeoutRef.current = null;
    }, 500);
  };

  // Core game logic
  const gasEstimateQuery = useClickGasEstimate();
  const nonceQuery = useTransactionNonce();

  async function submitOptimisticTransaction() {
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
      // gasEstimateQuery.data
    );

    // Add transaction to the feed
    setTransactions((prev) =>
      [
        {
          hash: txHash,
          timeTaken,
        },
        ...prev,
      ].slice(0, 10)
    ); // Keep last 10 transactions
  }

  // Helper function to check if an axe is unlocked
  const isAxeUnlocked = (axeType: AxeType): boolean => {
    if (!clickCount) return axeType === "axe";
    return clickCount >= AXE_UNLOCK_THRESHOLDS[axeType];
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4">
      {/* Game area (left + right columns) */}
      <div className="flex flex-col md:flex-row w-full gap-y-4 md:gap-y-0 md:gap-x-16 items-start">
        {/* Right column: main game area (order-1 on mobile) */}
        <div className="flex flex-col items-center w-full md:w-1/2 gap-1 order-1 md:order-none">
          <div className={`${styles.gameFrame} w-full`}>
            <div
              className="flex flex-row cursor-pointer w-full justify-center"
              onClick={handleCanvasClick}
            >
              <AnimationPreview
                action={"axe"}
                character={character}
                isAnimating={isAnimating}
                canvasSize={280}
                drawWidth={280}
                drawHeight={280}
                clickCount={localClickCount}
                style={{ width: "100%", maxWidth: 280, maxHeight: 280 }}
                axeType={selectedAxe}
              />
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="-ml-32 z-10 w-full max-w-[320px] h-auto"
              />
            </div>
          </div>
          {/* New Character Button */}
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

          {/* Axe Selection Grid */}
          <div className="w-full mt-4">
            <h3 className="font-bold text-[#5a4a1a] text-base mb-2">
              Select Axe
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {/* First Row */}
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
                          backgroundPosition: `-32px -64px` /* Column 2, Row 3 (axe facing right) */,
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

              {/* Second Row */}
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
                          backgroundPosition: `-32px -64px` /* Column 2, Row 3 (axe facing right) */,
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
        {/* Left column: three stacked boxes (order-2 on mobile) */}
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
              <span className="font-bold text-[#5a4a1a] text-lg leading-none mb-1">
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
              <span className="font-bold text-[#5a4a1a] text-lg leading-none">
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
            {/* Transaction Feed Header and List */}
            <h3 className="text-lg font-semibold mb-4 text-[#5a4a1a]">
              Recent Transactions
            </h3>
            <div className="flex items-center justify-between px-3 pb-4 text-[#5a4a1a] font-semibold text-[15px] border-b border-[#e0e0b2] mb-2">
              <span>Transaction</span>
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
      {/* Hide scrollbar utility for transaction feed */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

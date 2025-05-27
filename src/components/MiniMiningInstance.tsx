"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import actions from "@/const/actions";
import characterProperties from "@/const/characterProperties";
import Character from "@/types/Character";
import directions from "@/types/Direction";
import { useCharacterImages } from "@/hooks/useCharacterImages";
import { useFrameAnimation } from "@/hooks/useFrameAnimation";
import {
  drawCharacterLayers,
  CANVAS_SIZE as ORIGINAL_CANVAS_SIZE,
} from "@/utils/canvasUtils";
import { NatureTileName, renderNatureTile } from "@/utils/natureImages";

// Types for weapon selection (re-defined or imported if shared)
type AxeType =
  | "axe"
  | "axe_wood"
  | "axe_copper"
  | "axe_silver"
  | "axe_gold"
  | "axe_blue"
  | "axe_pink";

// Types for leaf particle animation
// type Leaf = {
//   id: string;
//   x: number;
//   y: number;
//   rotation: number;
//   scale: number;
//   velocityX: number;
//   velocityY: number;
//   angularVelocity: number;
//   type: string;
//   opacity: number;
//   gravity: number;
// };

// Available leaf types for animation
// const LEAF_TYPES = [
//   "Apple Tree Leaf",
//   "Orange Tree Leaf",
//   "Birch Tree Leaf",
//   "Pine Tree Leaf",
//   "Pear Tree Leaf",
// ];

interface MiniMiningInstanceProps {
  id: string;
  character: Character;
  selectedAxe: AxeType;
  initialClickCount: number;
  instanceCanvasSize?: number;
  uiState: "submitting" | "optimistic" | "confirmed" | "failed";
  clickTimestamp: number;
  optimisticConfirmTimestamp?: number;
  finalizedTimestamp?: number;
  blockExplorerBaseUrl?: string;
  txHash?: `0x${string}`;
}

const MiniMiningInstance: React.FC<MiniMiningInstanceProps> = ({
  id,
  character,
  selectedAxe,
  initialClickCount,
  instanceCanvasSize = 64,
  uiState,
  clickTimestamp,
  optimisticConfirmTimestamp,
  finalizedTimestamp,
  blockExplorerBaseUrl,
  txHash,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const [leaves, setLeaves] = useState<Leaf[]>([]);
  const animationLoopIdRef = useRef<number | null>(null);
  const [treeScale, setTreeScale] = useState(1);
  const treeAnimationRef = useRef<number | null>(null);

  const currentActionName =
    uiState === "submitting"
      ? "axe"
      : uiState === "optimistic"
      ? "axe"
      : uiState === "failed"
      ? "die"
      : "idle";

  const actualAction = actions[currentActionName] ? currentActionName : "idle";
  const actionToUse = actions[actualAction] ? actualAction : "idle";

  const direction = "right";
  const SPRITE_SCALE_FACTOR = 1;
  const CHARACTER_DRAW_SIZE = 32 * SPRITE_SCALE_FACTOR;
  const TREE_DRAW_SIZE = 32 * SPRITE_SCALE_FACTOR;
  const characterX = 0;
  const characterY = (instanceCanvasSize - CHARACTER_DRAW_SIZE) / 2;
  const treeX = instanceCanvasSize - TREE_DRAW_SIZE - 8;
  const treeY = (instanceCanvasSize - TREE_DRAW_SIZE) / 2;

  const getFilePathForLayer = useCallback(
    (layer: keyof typeof characterProperties) => {
      if (!character[layer] || !actions[actionToUse]) return "";
      const filePath = `animations/${actions[actionToUse].path}/${characterProperties[layer].path}/`;
      const file =
        characterProperties[layer].files[character[layer]?.type as number];
      const fileWithoutType = file.split(".")[0];
      const fileWithAction = `${fileWithoutType}_${actionToUse}`;
      return `${filePath}${fileWithAction}.${file.split(".")[1]}`;
    },
    [actionToUse, character]
  );

  const getToolFilePath = useCallback(() => {
    if (!actions[actionToUse]) return `animations/idle/e-tool/axe.png`;
    const toolType = actionToUse === "axe" ? selectedAxe : "axe";
    return `animations/${actions[actionToUse].path}/e-tool/${toolType}.png`;
  }, [actionToUse, selectedAxe]);

  const { layerImages, toolImage, isLoading } = useCharacterImages(
    character,
    actionToUse,
    getFilePathForLayer,
    getToolFilePath
  );

  const isAnimatingForHook =
    uiState === "submitting" || uiState === "optimistic";

  const { animationFrameRef, animationSpeed } = useFrameAnimation(
    actionToUse,
    isAnimatingForHook,
    isLoading,
    initialClickCount
  );

  useEffect(() => {
    if (uiState === "submitting" || uiState === "optimistic") {
      // createLeafBurst();
      animateTree();
    }
  }, [uiState]);

  useEffect(() => {
    if (isLoading || !canvasRef.current) {
      if (animationLoopIdRef.current) {
        cancelAnimationFrame(animationLoopIdRef.current);
        animationLoopIdRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTimestamp = 0;
    const targetInterval = animationSpeed;

    const gameLoop = (timestamp: number) => {
      // Determine if we should be in an active animation loop
      const shouldLoop =
        (uiState === "submitting" && actionToUse === "axe") || // Axe animation
        (uiState === "optimistic" && actionToUse === "axe") || // Axe animation (changed from pickaxe)
        (uiState === "failed" && actionToUse === "die"); // Die animation

      if (
        !shouldLoop &&
        uiState !== "confirmed" &&
        uiState !== "failed" &&
        uiState !== "submitting"
      ) {
        // If not looping and not in a state that requires a final static draw (confirmed, failed, submitting),
        // then clear and stop.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (animationLoopIdRef.current) {
          cancelAnimationFrame(animationLoopIdRef.current);
          animationLoopIdRef.current = null;
        }
        return;
      }

      // Frame skipping logic (throttling)
      if (shouldLoop && timestamp - lastTimestamp < targetInterval) {
        animationLoopIdRef.current = requestAnimationFrame(gameLoop);
        return; // Skip frame if not enough time has passed for active animations
      }
      lastTimestamp = timestamp;

      const currentFrame = animationFrameRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (uiState === "submitting" || uiState === "optimistic") {
        ctx.save();
        const treeCenterX = treeX + TREE_DRAW_SIZE / 2;
        const treeCenterY = treeY + TREE_DRAW_SIZE / 2;
        ctx.translate(treeCenterX, treeCenterY);
        ctx.scale(treeScale, treeScale);
        ctx.translate(-treeCenterX, -treeCenterY);
        renderNatureTile(
          ctx,
          "Apple Tree",
          treeX,
          treeY,
          TREE_DRAW_SIZE,
          TREE_DRAW_SIZE
        );
        ctx.restore();
      }

      // Draw Character (if applicable)
      if (
        shouldLoop || // Actively animating (axe, pickaxe, die)
        (uiState === "confirmed" && actionToUse === "idle") || // Static idle for confirmed
        (uiState === "failed" && actionToUse === "idle") || // Static idle for failed (if not dying)
        (uiState === "submitting" && actionToUse === "idle") || // Static idle for submitting (if not axing)
        (uiState === "optimistic" && actionToUse === "idle") // Static idle for optimistic (e.g. layers loading, not pickaxing)
      ) {
        drawCharacterLayers(
          ctx,
          canvas,
          layerImages,
          character,
          currentFrame,
          actionToUse,
          direction,
          CHARACTER_DRAW_SIZE,
          CHARACTER_DRAW_SIZE,
          toolImage,
          characterX,
          characterY
        );
      }

      // Overlays for final states or submitting message
      if (uiState === "failed" && actionToUse !== "die") {
        ctx.fillStyle = "rgba(139, 0, 0, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✖", canvas.width / 2, canvas.height / 2 + 8);
      }

      // Only continue RAF loop if we are actively animating.
      // For static states (confirmed, failed (no die), some idle cases), we draw once and stop.
      if (shouldLoop) {
        animationLoopIdRef.current = requestAnimationFrame(gameLoop);
      } else {
        // Drawn one static frame for confirmed/failed/submitting (if not covered by shouldLoop)
        // Clear the loop ref
        if (animationLoopIdRef.current) {
          cancelAnimationFrame(animationLoopIdRef.current);
          animationLoopIdRef.current = null;
        }
      }
    };

    if (!isLoading) {
      animationLoopIdRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationLoopIdRef.current) {
        cancelAnimationFrame(animationLoopIdRef.current);
        animationLoopIdRef.current = null;
      }
    };
  }, [
    isLoading,
    isAnimatingForHook,
    actionToUse,
    layerImages,
    toolImage,
    character,
    direction,
    treeScale,
    uiState,
    instanceCanvasSize,
    characterX,
    characterY,
    treeX,
    treeY,
    animationFrameRef,
    animationSpeed,
    TREE_DRAW_SIZE,
    CHARACTER_DRAW_SIZE,
  ]);

  const animateTree = () => {
    const ANIMATION_DURATION = 15;
    const MAX_SCALE = 1.1;
    let frame = 0;
    let growing = true;

    const doAnimate = () => {
      frame++;
      if (growing) {
        const progress = Math.min(1, frame / ANIMATION_DURATION);
        setTreeScale(1 + (MAX_SCALE - 1) * progress);
        if (frame >= ANIMATION_DURATION) {
          growing = false;
          frame = 0;
        }
      } else {
        const progress = Math.min(1, frame / ANIMATION_DURATION);
        setTreeScale(1 + (MAX_SCALE - 1) * (1 - progress));
        if (frame >= ANIMATION_DURATION) {
          setTreeScale(1);
          treeAnimationRef.current = null;
          return;
        }
      }
      treeAnimationRef.current = requestAnimationFrame(doAnimate);
    };
    treeAnimationRef.current = requestAnimationFrame(doAnimate);
  };

  let bgColorClass = "bg-transparent";
  let borderColorClass = "border-transparent";
  let statusText = "";

  if (uiState === "submitting") {
    bgColorClass = "bg-orange-500/20";
    borderColorClass = "border-orange-500";
    statusText = "Submitting Transaction...";
  } else if (uiState === "optimistic") {
    bgColorClass = "bg-green-500/20";
    borderColorClass = "border-green-500";
    statusText = "Optimistically Confirmed.";
  } else if (uiState === "confirmed") {
    bgColorClass = "bg-green-600";
    borderColorClass = "border-green-700";
    const timeToOptimistic =
      optimisticConfirmTimestamp && clickTimestamp
        ? ((optimisticConfirmTimestamp - clickTimestamp) / 1000).toFixed(2)
        : "N/A";
    const timeToFinalized =
      finalizedTimestamp && optimisticConfirmTimestamp
        ? ((finalizedTimestamp - optimisticConfirmTimestamp) / 1000).toFixed(2)
        : "N/A";
    statusText = `⏱️ Opt: ${timeToOptimistic}s, ⏱️ Final: ${timeToFinalized}s`;
  } else if (uiState === "failed") {
    bgColorClass = "bg-red-600";
    borderColorClass = "border-red-700";
    statusText = "Mining Failed.";
  }

  const isLinkable =
    (uiState === "confirmed" || uiState === "failed") &&
    !!blockExplorerBaseUrl &&
    !!txHash;

  const href = isLinkable ? `${blockExplorerBaseUrl}/tx/${txHash}` : undefined;

  const Tag = isLinkable ? "a" : "div";

  const wrapperProps: React.HTMLAttributes<HTMLDivElement> &
    React.AnchorHTMLAttributes<HTMLAnchorElement> = {
    className: `w-full p-2 rounded-md border-2 ${bgColorClass} ${borderColorClass} flex items-center gap-3 transition-all duration-300 ${
      isLinkable ? "hover:opacity-90 cursor-pointer" : ""
    }`,
  };

  if (isLinkable && href) {
    wrapperProps.href = href;
    wrapperProps.target = "_blank";
    wrapperProps.rel = "noopener noreferrer";
    wrapperProps.title = `View Transaction: ${txHash}`;
  }

  return (
    <Tag {...wrapperProps}>
      {uiState === "confirmed" ? (
        <div
          style={{ width: instanceCanvasSize, height: instanceCanvasSize }}
          className="flex items-center justify-center z-10 rounded"
        >
          <span className="text-3xl" role="img" aria-label="Confirmed">
            ✅
          </span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={instanceCanvasSize}
          height={instanceCanvasSize}
          className={`z-10 rounded ${uiState === "failed" ? "opacity-80" : ""}`}
          style={{ imageRendering: "pixelated" }}
        />
      )}
      <div className="flex-grow text-xs flex flex-col">
        <p
          className={`font-semibold ${
            uiState === "confirmed" || uiState === "failed"
              ? "text-white"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {statusText}
        </p>
        {isLinkable && txHash && (
          <p
            className="text-xs mt-1 truncate max-w-full break-words"
            style={{
              color:
                uiState === "confirmed" || uiState === "failed"
                  ? "white"
                  : "inherit",
              opacity: 0.8,
            }}
          >
            Tx: {`${txHash.slice(0, 6)}...${txHash.slice(-4)}`}
          </p>
        )}
      </div>
    </Tag>
  );
};

export default MiniMiningInstance;

"use client";

import { useEffect, useRef, useState } from "react";
import { renderNatureTile } from "@/utils/natureImages";
import AnimationPreview from "@/components/AnimationPreview";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import Character from "@/types/Character";
import useClickGasEstimate from "@/hooks/useClickGasEstimate";
import useTransactionNonce from "@/hooks/useTransactionNonce";
import { useAbstractSession } from "@/hooks/useAbstractSession";
import { privateKeyToAccount } from "viem/accounts";
import signClickTx from "@/lib/transaction/sendClickTx";
import { useAccount } from "wagmi";

export default function MiningGame({
  character: initialCharacter,
}: {
  character?: Character;
}) {
  const { address } = useAccount();
  const { data: sessionData } = useAbstractSession();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [character] = useState(
    () => initialCharacter || generateRandomCharacter()
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple tree growth animation
  useEffect(() => {
    let animationFrameId: number | null = null;
    let treeScale = 1;
    let growing = false;
    let animationProgress = 0;
    const ANIMATION_DURATION = 0.5; // seconds
    const MAX_SCALE = 1.15; // Maximum 15% growth

    const renderTree = async (scale = 1) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      // Clear the canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Save context, apply scaling transformation centered on tree, then restore
      ctx.save();

      // Scale from the center of the canvas
      const centerX = canvasRef.current.width / 2;
      const centerY = canvasRef.current.height / 2;

      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      // Draw the tree centered in the canvas (instead of at 0,0)
      // Calculate offset to center the 240x240 tree in a larger canvas
      const offsetX = (canvasRef.current.width - 240) / 2;
      const offsetY = (canvasRef.current.height - 240) / 2;
      await renderNatureTile(ctx, "Apple Tree", offsetX, offsetY, 240, 240);

      ctx.restore();
    };

    // Initial render
    renderTree();

    // Animation loop
    const animate = (timestamp: number) => {
      if (!growing && treeScale === 1) {
        animationFrameId = null;
        return;
      }

      // Calculate progress (0 to 1)
      animationProgress += 1 / 60; // Assuming ~60fps

      if (growing) {
        // Growing phase (0 to MAX_SCALE)
        treeScale =
          1 +
          (MAX_SCALE - 1) * Math.min(1, animationProgress / ANIMATION_DURATION);

        if (animationProgress >= ANIMATION_DURATION) {
          growing = false;
          animationProgress = 0;
        }
      } else {
        // Shrinking phase (MAX_SCALE to 1)
        treeScale =
          1 +
          (MAX_SCALE - 1) *
            (1 - Math.min(1, animationProgress / ANIMATION_DURATION));

        if (animationProgress >= ANIMATION_DURATION) {
          treeScale = 1;
          animationProgress = 0;
        }
      }

      renderTree(treeScale);
      animationFrameId = requestAnimationFrame(animate);
    };

    // Handle clicks
    const handleTreeClick = () => {
      growing = true;
      animationProgress = 0;

      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    // Attach click handler directly to canvas
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("click", handleTreeClick);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("click", handleTreeClick);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Increment click counter for animation speed scaling
    setClickCount((prev) => prev + 1);
    setIsAnimating(true);

    submitOptimisticTransaction();
    nonceQuery.incrementNonce();

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
    const startTime = performance.now();

    if (!address) throw new Error("No AGW address found");
    if (!sessionData?.privateKey) throw new Error("No session signer found");
    if (!gasEstimateQuery.data) throw new Error("No gas estimate found");
    if (!nonceQuery.nonce) throw new Error("No nonce found");

    const signer = privateKeyToAccount(sessionData.privateKey);

    await signClickTx(
      address,
      signer,
      sessionData.session,
      nonceQuery.nonce
      // gasEstimateQuery.data
    );

    const endTime = performance.now();

    console.log(`⏱️: ${(endTime - startTime).toFixed(2)}ms`);
  }

  return (
    <>
      <div className="flex flex-row">
        <AnimationPreview
          action={"axe"}
          character={character}
          isAnimating={isAnimating}
          canvasSize={240}
          drawWidth={240}
          drawHeight={240}
          clickCount={clickCount}
          style={{ width: "240px", height: "240px" }}
        />
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="-ml-15 z-10 cursor-pointer"
          onClick={handleCanvasClick}
        />
      </div>
    </>
  );
}

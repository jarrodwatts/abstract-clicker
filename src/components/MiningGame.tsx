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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [character] = useState(
    () => initialCharacter || generateRandomCharacter()
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Leaf animation system
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  // Tree animation state
  const [treeScale, setTreeScale] = useState(1);
  const [treeAnimationTrigger, setTreeAnimationTrigger] = useState(0);
  const treeAnimationRef = useRef<number | null>(null);

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
        await renderNatureTile(ctx, leaf.type as any, -15, -15, 30, 30);
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Increment click counter for animation speed scaling
    setClickCount((prev) => prev + 1);
    setIsAnimating(true);

    // Create the leaf burst effect
    createLeafBurst();

    // Trigger tree animation by incrementing the trigger counter
    setTreeAnimationTrigger((prev) => prev + 1);

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

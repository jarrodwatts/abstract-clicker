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
type Leaf = {
  id: string;
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

interface MiniMiningInstanceProps {
  id: string;
  character: Character;
  selectedAxe: AxeType;
  initialClickCount: number; // To pass to useFrameAnimation
  onComplete: (id: string) => void;
  instanceCanvasSize?: number; // e.g. 64
}

const MiniMiningInstance: React.FC<MiniMiningInstanceProps> = ({
  id,
  character,
  selectedAxe,
  initialClickCount,
  onComplete,
  instanceCanvasSize = 64,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const animationFrameIdRef = useRef<number | null>(null); // For leaf animation
  const [treeScale, setTreeScale] = useState(1);
  const treeAnimationRef = useRef<number | null>(null);

  const action = "axe"; // Fixed for this component
  const direction = "right"; // Default direction
  const SPRITE_SCALE_FACTOR = 1; // Draw sprites at 1x
  const CHARACTER_DRAW_SIZE = 32 * SPRITE_SCALE_FACTOR;
  const TREE_DRAW_SIZE = 32 * SPRITE_SCALE_FACTOR;

  // Position character and tree within the small canvas
  // Character bottom-left of its 32x32 space, tree bottom-right of its 32x32 space
  const characterX = 0;
  const characterY = instanceCanvasSize - CHARACTER_DRAW_SIZE;
  const treeX = instanceCanvasSize - TREE_DRAW_SIZE - 8;
  const treeY = instanceCanvasSize - TREE_DRAW_SIZE;

  // Get file path for each character layer based on action
  const getFilePathForLayer = useCallback(
    (layer: keyof typeof characterProperties) => {
      if (!character[layer]) return "";
      const filePath = `animations/${actions[action].path}/${characterProperties[layer].path}/`;
      const file =
        characterProperties[layer].files[character[layer]?.type as number];
      const fileWithoutType = file.split(".")[0];
      const fileWithAction = `${fileWithoutType}_${action}`;
      return `${filePath}${fileWithAction}.${file.split(".")[1]}`;
    },
    [action, character]
  );

  // Get special file path for the axe/tool
  const getToolFilePath = useCallback(() => {
    return `animations/${actions[action].path}/e-tool/${selectedAxe}.png`;
  }, [action, selectedAxe]);

  const { layerImages, toolImage, isLoading } = useCharacterImages(
    character,
    action,
    getFilePathForLayer,
    getToolFilePath
  );

  // Frame animation for the character
  const animationFrame = useFrameAnimation(
    action,
    true, // isAnimating is always true for the lifetime of this instance
    isLoading,
    initialClickCount // Use the click count at the moment of creation
  );

  // Create leaf burst on mount
  useEffect(() => {
    createLeafBurst();
    // Trigger tree animation
    animateTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main drawing effect for character, tree, and leaves
  useEffect(() => {
    if (!canvasRef.current || isLoading) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the tree (scaled)
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

    // Draw character
    // Scaling within drawCharacterLayers is based on ORIGINAL_CANVAS_SIZE, so we draw to a conceptual 32x32 area.
    // The drawCharacterLayers function handles internal scaling if its canvas argument (first one) has different size than ORIGINAL_CANVAS_SIZE.
    // For 1x rendering of a 32px sprite, we'd ideally pass a 32x32 canvas to it.
    // Here, we draw directly to our instance canvas, but specify drawWidth/Height for the character.
    // We want to draw the character in a 32x32 pixel area.
    drawCharacterLayers(
      ctx,
      canvas, // This canvas is instanceCanvasSize (e.g. 64x64)
      layerImages,
      character,
      animationFrame,
      action,
      direction,
      CHARACTER_DRAW_SIZE, // draw character at 32px width
      CHARACTER_DRAW_SIZE, // draw character at 32px height
      toolImage,
      characterX, // destinationX
      characterY // destinationY
      // SPRITE_SCALE_FACTOR is not a direct param; handled by CHARACTER_DRAW_SIZE
    );

    // Draw leaves
    for (const leaf of leaves) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rotation);
      ctx.scale(leaf.scale, leaf.scale);
      ctx.globalAlpha = leaf.opacity;
      renderNatureTile(ctx, leaf.type as NatureTileName, -8, -8, 16, 16); // Smaller leaves
      ctx.restore();
    }
  }, [
    isLoading,
    layerImages,
    toolImage,
    animationFrame,
    character,
    action,
    direction,
    leaves,
    treeScale,
    instanceCanvasSize, // Re-draw if canvas size prop changes (though not expected for an instance)
    characterX,
    characterY,
    treeX,
    treeY,
  ]);

  // Tree animation system (simplified for mini instance)
  const animateTree = () => {
    const ANIMATION_DURATION = 15; // Shorter for mini
    const MAX_SCALE = 1.1; // Less pronounced
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
          treeAnimationRef.current = null; // End animation
          return;
        }
      }
      treeAnimationRef.current = requestAnimationFrame(doAnimate);
    };
    treeAnimationRef.current = requestAnimationFrame(doAnimate);
  };

  const updateLeafParticles = useCallback(() => {
    setLeaves((prevLeaves) => {
      const updatedLeaves = prevLeaves.map((leaf) => ({
        ...leaf,
        x: leaf.x + leaf.velocityX,
        y: leaf.y + leaf.velocityY,
        rotation: leaf.rotation + leaf.angularVelocity,
        velocityX: leaf.velocityX * 0.95,
        velocityY: (leaf.velocityY + leaf.gravity) * 0.95,
        opacity: leaf.opacity * 0.98, // Fade a bit faster
      }));

      const activeLeaves = updatedLeaves.filter(
        (leaf) =>
          leaf.opacity > 0.1 &&
          leaf.x > -20 &&
          leaf.x < instanceCanvasSize + 20 &&
          leaf.y > -20 &&
          leaf.y < instanceCanvasSize + 20
      );

      if (activeLeaves.length === 0) {
        if (animationFrameIdRef.current)
          cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return activeLeaves;
    });
    // Continue animation loop if there are still leaves
    // This check should be inside setLeaves's callback or after it, based on activeLeaves.length
    // For now, the requestAnimationFrame is outside setLeaves and will run if leaves.length (from previous render) > 0
    // This needs to be slightly rethought if animationFrameIdRef is nulled out by setLeaves's callback.
    if (leaves.length > 0) {
      // Check current leaves length; if it becomes 0 after setLeaves, this might run one extra time
      animationFrameIdRef.current = requestAnimationFrame(
        updateLeafParticlesInternalRef.current!
      );
    } else {
      if (animationFrameIdRef.current)
        cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceCanvasSize]); // Removed leaves from deps to avoid re-creating function every time leaves change

  // Leaf animation system
  useEffect(() => {
    // This effect now just manages starting and stopping the loop based on leaves count
    if (leaves.length > 0 && !animationFrameIdRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(
        updateLeafParticlesInternalRef.current!
      );
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [leaves, instanceCanvasSize]); // Rerun if leaves array or canvasSize changes

  const createLeafBurst = () => {
    const burstCenterX = treeX + TREE_DRAW_SIZE / 2; // Emit from tree center
    const burstCenterY = treeY + TREE_DRAW_SIZE / 2;
    const numLeaves = 3 + Math.floor(Math.random() * 3); // Fewer leaves
    const newLeaves: Leaf[] = [];

    for (let i = 0; i < numLeaves; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 2; // Slower speed for small canvas
      newLeaves.push({
        id: `leaf-${Date.now()}-${i}`,
        x: burstCenterX,
        y: burstCenterY,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.2 + Math.random() * 0.2, // Smaller scale
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        angularVelocity: (Math.random() - 0.5) * 0.1,
        type: LEAF_TYPES[Math.floor(Math.random() * LEAF_TYPES.length)],
        opacity: 0.7 + Math.random() * 0.2,
        gravity: 0.03 + Math.random() * 0.03, // Less gravity
      });
    }
    setLeaves((prevLeaves) => [...prevLeaves, ...newLeaves]);
    // Ensure animation loop starts if it wasn't running
    if (!animationFrameIdRef.current && newLeaves.length > 0) {
      animationFrameIdRef.current = requestAnimationFrame(
        updateLeafParticlesInternalRef.current!
      );
    }
  };

  // To ensure the updateLeafParticles used in requestAnimationFrame has the latest state for `leaves`
  const updateLeafParticlesInternalRef = useRef(updateLeafParticles);
  useEffect(() => {
    updateLeafParticlesInternalRef.current = updateLeafParticles;
  }, [updateLeafParticles]);

  return (
    <canvas
      ref={canvasRef}
      width={instanceCanvasSize}
      height={instanceCanvasSize}
      className="z-20 border " // Simple border for visibility
      style={{ imageRendering: "pixelated" }}
    />
  );
};

export default MiniMiningInstance;

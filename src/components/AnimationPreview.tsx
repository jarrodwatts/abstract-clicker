"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import actions from "@/const/actions";
import characterProperties from "@/const/characterProperties";
import Character from "@/types/Character";
import directions from "@/types/Direction";

interface AnimationCanvasProps {
  character: Character;
  action: keyof typeof actions;
  direction?: keyof typeof directions;
  isAnimating?: boolean;
}

const AnimationPreview: React.FC<AnimationCanvasProps> = ({
  character,
  action,
  direction = "right",
  isAnimating = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layerImages, setLayerImages] = useState<
    Record<string, HTMLImageElement>
  >({});
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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

  // Reset state when character or action changes
  useEffect(() => {
    setLayerImages({});
    setAnimationFrame(0);
    setIsLoading(true);
  }, [character, action]);

  // Load all images for the character layers
  useEffect(() => {
    if (!canvasRef.current) return;

    const loadImages = async () => {
      // Clear canvas while loading
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get character keys that have values, ordered by layer index
      const characterKeys = Object.keys(character)
        .filter((key) => character[key as keyof Character] !== undefined)
        .sort((a, b) => {
          const keyA = a as keyof typeof characterProperties;
          const keyB = b as keyof typeof characterProperties;
          return (
            characterProperties[keyA].layerIndex -
            characterProperties[keyB].layerIndex
          );
        }) as Array<keyof typeof characterProperties>;

      // Load images in parallel
      const imagePromises = characterKeys.map((key) => {
        return new Promise<{ key: string; image: HTMLImageElement }>(
          (resolve) => {
            const image = new Image();
            const src = getFilePathForLayer(key);
            if (!src) {
              return resolve({ key: key as string, image: new Image() });
            }

            image.src = src;
            image.onload = () => resolve({ key: key as string, image });
            image.onerror = () =>
              resolve({ key: key as string, image: new Image() });
          }
        );
      });

      // Wait for all images to load
      const results = await Promise.all(imagePromises);

      // Create new images object
      const newImages = results.reduce<Record<string, HTMLImageElement>>(
        (acc, { key, image }) => {
          if (image.complete && image.src) acc[key] = image;
          return acc;
        },
        {}
      );

      setLayerImages(newImages);
      setIsLoading(false);
    };

    loadImages();
  }, [character, action, getFilePathForLayer]);

  // Draw the animation frame on the canvas
  useEffect(() => {
    if (!canvasRef.current || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas before drawing new frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply clipping to prevent adjacent frames from showing
    const clipSize = Math.min(canvas.width, canvas.height) * 0.85; // 85% of canvas size
    const clipX = (canvas.width - clipSize) / 2;
    const clipY = (canvas.height - clipSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, clipY, clipSize, clipSize);
    ctx.clip();

    // Get ordered keys based on layer index
    const orderedKeys = Object.keys(layerImages).sort((a, b) => {
      const keyA = a as keyof typeof characterProperties;
      const keyB = b as keyof typeof characterProperties;
      return (
        characterProperties[keyA].layerIndex -
        characterProperties[keyB].layerIndex
      );
    });

    // Draw each layer in the correct order
    orderedKeys.forEach((key) => {
      const typedKey = key as keyof typeof characterProperties;
      const image = layerImages[key];
      const characterProp = character[typedKey];

      if (!image || !characterProp) return;

      const { frameSize } = actions[action];
      const directionIndex = directions[direction];

      // Calculate sprite position in spritesheet
      const spriteX =
        animationFrame * frameSize.x +
        characterProp.color *
          frameSize.x *
          actions[action].animationFrameLength;
      const spriteY = directionIndex * frameSize.y;

      // Center the sprite in the canvas
      const drawSize = canvas.width * 0.9; // 90% of canvas size
      const drawX = (canvas.width - drawSize) / 2;
      const drawY = (canvas.height - drawSize) / 2;

      ctx.drawImage(
        image,
        // Source coordinates
        spriteX,
        spriteY,
        frameSize.x,
        frameSize.y,
        // Destination coordinates
        drawX,
        drawY,
        drawSize,
        drawSize
      );
    });

    // Restore canvas context
    ctx.restore();
  }, [layerImages, animationFrame, character, action, direction, isLoading]);

  // Animation loop effect - only run when isAnimating is true
  useEffect(() => {
    if (isLoading || !isAnimating) return;

    const interval = setInterval(() => {
      setAnimationFrame((current) =>
        current >= actions[action].animationFrameLength - 1 ? 0 : current + 1
      );
    }, 80);

    return () => clearInterval(interval);
  }, [action, isLoading, isAnimating]);

  // Reset animation frame when not animating
  useEffect(() => {
    if (!isAnimating) {
      setAnimationFrame(0);
    }
  }, [isAnimating]);

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={256}
      style={{
        borderRadius: 8,
      }}
    />
  );
};

export default AnimationPreview;

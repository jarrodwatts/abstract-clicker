"use client";

import React, { useEffect, useRef, useState } from "react";
import characterProperties from "@/const/characterProperties";
import Character from "@/types/Character";

interface CharacterCanvasProps {
  character: Character;
}

/**
 * Takes a character and renders each layer onto a canvas to preview the full character.
 * Provides a simple way to preview what a character looks like in the game.
 * This isn't used anywhere but is a nice way to preview the character.
 */
const CharacterPreview: React.FC<CharacterCanvasProps> = ({ character }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImages, setLoadedImages] = useState<
    Record<string, HTMLImageElement>
  >({});

  // Load all character images when character changes
  useEffect(() => {
    const loadImages = async () => {
      // Clear canvas while loading
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx)
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
      }

      // Get all character keys that have values
      const characterKeys = Object.keys(character).filter(
        (key) => character[key as keyof Character] !== undefined
      ) as Array<keyof typeof characterProperties>;

      // Create promises for all images that need to be loaded
      const imagePromises = characterKeys.map((key) => {
        return new Promise<{ key: string; image: HTMLImageElement }>(
          (resolve) => {
            const image = new Image();
            const characterProp = character[key];
            if (!characterProp)
              return resolve({ key: key as string, image: new Image() });

            const path = `/cozy-people-asset-pack/${
              characterProperties[key].path
            }/${characterProperties[key].files[characterProp.type]}`;

            image.src = path;
            image.onload = () => resolve({ key: key as string, image });
            image.onerror = () =>
              resolve({ key: key as string, image: new Image() });
          }
        );
      });

      // Wait for all images to load
      const results = await Promise.all(imagePromises);

      // Build the images object
      const newImages = results.reduce<Record<string, HTMLImageElement>>(
        (acc, { key, image }) => {
          if (image.complete && image.src) acc[key] = image;
          return acc;
        },
        {}
      );

      setLoadedImages(newImages);
    };

    loadImages();
  }, [character]);

  // Draw the images on the canvas whenever images are loaded
  useEffect(() => {
    if (!canvasRef.current || Object.keys(loadedImages).length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sort keys by layer index
    const orderedKeys = Object.keys(loadedImages).sort((a, b) => {
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
      const charProperty = character[typedKey];
      const image = loadedImages[key];

      if (!charProperty || !image) return;

      const { frameSize } = characterProperties[typedKey];

      // Draw the image for this layer
      ctx.drawImage(
        image,
        frameSize.x * (charProperty.color || 0) * 8, // x position in spritesheet
        0, // y position in spritesheet
        frameSize.x, // width in spritesheet
        frameSize.y, // height in spritesheet
        0, // x position on canvas
        0, // y position on canvas
        canvas.width, // width on canvas
        canvas.height // height on canvas
      );
    });
  }, [loadedImages, character]);

  return <canvas ref={canvasRef} width={256} height={256} />;
};

export default CharacterPreview;

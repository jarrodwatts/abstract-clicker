"use client";

import { useEffect, useRef, useState } from "react";
import { renderNatureTile } from "@/utils/natureImages";
import AnimationPreview from "@/components/AnimationPreview";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import Character from "@/types/Character";

export default function MiningGame({
  character: initialCharacter,
}: {
  character?: Character;
}) {
  console.log(initialCharacter);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [character] = useState(
    () => initialCharacter || generateRandomCharacter()
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const renderTiles = async () => {
      if (!canvasRef.current) return;

      try {
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        // Render an Apple Tree scaled up to 100x100
        await renderNatureTile(ctx, "Apple Tree", 0, 0, 240, 240);
      } catch (error) {
        console.error("Failed to render nature tiles", error);
      }
    };

    renderTiles();
  }, []);

  const handleCanvasClick = () => {
    console.log("Canvas clicked - mining action!");
    setIsAnimating(true);

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

  return (
    <>
      <div className="flex flex-row">
        <AnimationPreview
          action={"axe"}
          character={character}
          isAnimating={isAnimating}
          canvasSize={240}
        />
        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          className="-ml-15 z-10"
          onClick={handleCanvasClick}
        />
      </div>
    </>
  );
}

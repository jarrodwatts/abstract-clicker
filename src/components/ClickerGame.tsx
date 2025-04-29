"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import AnimationPreview from "./AnimationPreview";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import Character from "@/types/Character";
import { cn } from "@/lib/utils";

// Interface for click feedback animations
interface ClickFeedback {
  id: number;
  x: number;
  y: number;
  value: number;
}

export default function ClickerGame() {
  // Game state
  const [score, setScore] = useState<number>(0);
  const [character, setCharacter] = useState<Character | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [clickScale, setClickScale] = useState<boolean>(false);
  const [clickFeedback, setClickFeedback] = useState<ClickFeedback[]>([]);

  // Element references
  const characterContainerRef = useRef<HTMLDivElement>(null);
  const animationTimeout = useRef<NodeJS.Timeout | null>(null);
  const uniqueIdCounter = useRef<number>(0);

  // Generate a random character on component mount
  useEffect(() => {
    setCharacter(generateRandomCharacter());
  }, []);

  // Create visual feedback animation when clicking
  const createClickFeedback = useCallback(
    (x: number, y: number, value: number) => {
      const id = uniqueIdCounter.current++;

      setClickFeedback((prev) => [...prev, { id, x, y, value }]);

      // Remove the feedback after animation completes
      setTimeout(() => {
        setClickFeedback((prev) => prev.filter((item) => item.id !== id));
      }, 1500);
    },
    []
  );

  // Handle character click to trigger animation and increment score
  const handleCharacterClick = useCallback(
    (e: React.MouseEvent) => {
      // Increment score
      setScore((prev) => prev + 1);

      // Create click feedback at mouse position
      if (characterContainerRef.current) {
        const rect = characterContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        createClickFeedback(x, y, 1);
      }

      // Visual feedback
      setClickScale(true);
      setTimeout(() => setClickScale(false), 100);

      // Trigger animation if not already animating
      if (!isAnimating) {
        setIsAnimating(true);

        // Reset animation after animation cycle completes
        if (animationTimeout.current) {
          clearTimeout(animationTimeout.current);
        }

        // Animation duration = 5 frames × 80ms per frame
        animationTimeout.current = setTimeout(() => {
          setIsAnimating(false);
        }, 400);
      }
    },
    [isAnimating, createClickFeedback]
  );

  return (
    <div className="flex flex-col items-center gap-4 p-6 max-w-xl mx-auto">
      {/* Score display */}
      <div className="text-4xl font-bold mb-2">
        Score: {score.toLocaleString()}
      </div>

      {/* Character animation preview (clickable) */}
      <div
        ref={characterContainerRef}
        className={cn(
          "relative cursor-pointer rounded-lg p-4 overflow-hidden",
          clickScale ? "scale-95" : "scale-100",
          "transition-transform duration-100"
        )}
        onClick={handleCharacterClick}
      >
        {/* Click feedback animations */}
        {clickFeedback.map(({ id, x, y, value }) => (
          <div
            key={id}
            className="absolute pointer-events-none text-yellow-500 font-bold animate-float-up"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              animation: "float-up 1.5s ease-out forwards",
            }}
          >
            +{value}
          </div>
        ))}

        {character && (
          <AnimationPreview
            character={character}
            action="pickaxe"
            isAnimating={isAnimating}
          />
        )}
      </div>

      <style jsx global>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-50px) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}

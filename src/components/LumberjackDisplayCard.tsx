"use client";

import React from "react";
import Character from "@/types/Character";
import AnimationPreview from "./AnimationPreview"; // Import AnimationPreview

interface LumberjackDisplayCardProps {
  character: Character;
  canvasSize?: number;
}

const LumberjackDisplayCard: React.FC<LumberjackDisplayCardProps> = ({
  character,
  canvasSize = 48, // Adjusted default size for the card, can be overridden by MiningGame.tsx if needed
}) => {
  return (
    <AnimationPreview
      character={character}
      action="axe"
      isAnimating={true}
      canvasSize={canvasSize} // This will be the <canvas> element's dimensions
      drawWidth={canvasSize} // This will be the size the character is drawn at within the canvas
      drawHeight={canvasSize} // Same as drawWidth
      // style={{ border: "1px solid blue" }} // Optional: for debugging positioning
    />
  );
};

export default LumberjackDisplayCard;

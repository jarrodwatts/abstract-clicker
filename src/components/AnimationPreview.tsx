"use client";

import React, { useEffect, useRef, useCallback } from "react";
import actions from "@/const/actions";
import characterProperties from "@/const/characterProperties";
import Character from "@/types/Character";
import directions from "@/types/Direction";
import { useCharacterImages } from "@/hooks/useCharacterImages";
import { useFrameAnimation } from "@/hooks/useFrameAnimation";
import { drawCharacterLayers, CANVAS_SIZE } from "@/utils/canvasUtils";

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

  const { layerImages, isLoading } = useCharacterImages(
    character,
    action,
    getFilePathForLayer
  );

  const animationFrame = useFrameAnimation(action, isAnimating, isLoading);

  // Draw the animation frame on the canvas
  useEffect(() => {
    if (!canvasRef.current || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawCharacterLayers(
      ctx,
      canvas,
      layerImages,
      character,
      animationFrame,
      action,
      direction
    );
  }, [layerImages, animationFrame, character, action, direction, isLoading]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{
        borderRadius: 8,
      }}
    />
  );
};

export default AnimationPreview;

"use client";

import React, { useEffect, useRef, useCallback } from "react";
import actions from "@/const/actions";
import characterProperties from "@/const/characterProperties";
import Character from "@/types/Character";
import directions from "@/types/Direction";
import { useCharacterImages } from "@/hooks/useCharacterImages";
import { useFrameAnimation } from "@/hooks/useFrameAnimation";
import { drawCharacterLayers, CANVAS_SIZE } from "@/utils/canvasUtils";

// Types for weapon selection
type AxeType =
  | "axe"
  | "axe_wood"
  | "axe_copper"
  | "axe_silver"
  | "axe_gold"
  | "axe_blue"
  | "axe_pink";

interface AnimationCanvasProps {
  character: Character;
  action: keyof typeof actions;
  direction?: keyof typeof directions;
  isAnimating?: boolean;
  canvasSize?: number;
  drawWidth?: number;
  drawHeight?: number;
  clickCount?: number;
  style?: React.CSSProperties;
  axeType?: AxeType;
}

const AnimationPreview: React.FC<AnimationCanvasProps> = ({
  character,
  action,
  direction = "right",
  isAnimating = false,
  canvasSize = CANVAS_SIZE,
  drawWidth,
  drawHeight,
  clickCount = 0,
  style,
  axeType = "axe",
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

  // Get special file path for the axe/tool
  const getToolFilePath = useCallback(() => {
    return `animations/${actions[action].path}/e-tool/${axeType}.png`;
  }, [action, axeType]);

  const { layerImages, toolImage, isLoading } = useCharacterImages(
    character,
    action,
    getFilePathForLayer,
    getToolFilePath
  );

  const { currentFrame, animationSpeed } = useFrameAnimation(
    action,
    isAnimating,
    isLoading,
    clickCount
  );

  // Draw the animation frame on the canvas
  useEffect(() => {
    if (!canvasRef.current || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear the canvas before drawing the new frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCharacterLayers(
      ctx,
      canvas,
      layerImages,
      character,
      currentFrame,
      action,
      direction,
      drawWidth,
      drawHeight,
      toolImage
    );
  }, [
    layerImages,
    toolImage,
    currentFrame,
    character,
    action,
    direction,
    isLoading,
    drawWidth,
    drawHeight,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      className="z-20"
      style={style}
    />
  );
};

export default AnimationPreview;

"use client";

import React, { useEffect, useRef, useCallback } from "react";
import actions from "@/const/actions";
import characterProperties from "@/const/characterProperties";
import Character from "@/types/Character";
import directions from "@/types/Direction";
import { useCharacterImages } from "@/hooks/useCharacterImages";
import { useFrameAnimation } from "@/hooks/useFrameAnimation";
import { drawCharacterLayers, CANVAS_SIZE } from "@/utils/canvasUtils";

// This is not used anymore, but keeping if we want to introduce cosmetics later.
// We can animate many different colors of axe.
type AxeType =
  | "axe"
  | "axe_wood"
  | "axe_copper"
  | "axe_silver"
  | "axe_gold"
  | "axe_blue"
  | "axe_pink";


interface AnimationCanvasProps {
  character: Character; // character to animate
  action: keyof typeof actions; // action for character e.g. "walk" or "axe"
  direction?: keyof typeof directions; // direction for the animation to play
  isAnimating?: boolean; // flag to indicate if the animation is playing we can toggle
  canvasSize?: number; // size of the canvas to draw
  drawWidth?: number; // within the canvas, how wide to draw the character
  drawHeight?: number; // within the canvas, how tall to draw the character
  style?: React.CSSProperties; // style to apply to the canvas
  axeType?: AxeType; // Not used anymore, but keeping if we want to introduce cosmetics later.
}

const AnimationPreview: React.FC<AnimationCanvasProps> = ({
  character,
  action,
  direction = "right",
  isAnimating = false,
  canvasSize = CANVAS_SIZE,
  drawWidth,
  drawHeight,
  style,
  axeType = "axe",
}) => {
  // Keep a reference to the canvas element
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get the file path of the image to render for each layer of the character
  // Characters have many layers, e.g. body, hair, eyes, etc.
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
  // This is kind of redundant now we don't have different colors of axe
  const getToolFilePath = useCallback(() => {
    return `animations/${actions[action].path}/e-tool/${axeType}.png`;
  }, [action, axeType]);

  // Load all of the character images we want to draw on the canvas.
  const { layerImages, toolImage, isLoading } = useCharacterImages(
    character,
    action,
    getFilePathForLayer,
    getToolFilePath
  );

  // Get the current frame of the animation to draw
  // Each spritesheet has a set number of frames, and we want to animate through them.
  const { currentFrame } = useFrameAnimation(
    action,
    isAnimating,
    isLoading,
  );

  // Draw the animation frame on the canvas
  useEffect(() => {
    if (!canvasRef.current || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear the canvas before drawing the new frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Layer by layer, draw the character on the canvas for the current frame of the animation.
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

  // Render the canvas with the current frame of the animation.
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

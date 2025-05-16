import Character from "@/types/Character";
import characterProperties from "@/const/characterProperties";
import actions from "@/const/actions";
import directions from "@/types/Direction";

// Canvas sizing constants
export const CANVAS_SIZE = 256;
export const SPRITE_SCALE = 0.9; // 90% of canvas size
export const CLIP_SCALE = 0.85; // 85% of canvas size

/**
 * Draw character layers on the canvas
 */
export function drawCharacterLayers(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  layerImages: Record<string, HTMLImageElement>,
  character: Character,
  animationFrame: number,
  action: keyof typeof actions,
  direction: keyof typeof directions
) {
  // Clear canvas before drawing new frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply clipping to prevent adjacent frames from showing
  const clipSize = Math.min(canvas.width, canvas.height) * CLIP_SCALE;
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
      characterProp.color * frameSize.x * actions[action].animationFrameLength;
    const spriteY = directionIndex * frameSize.y;

    // Center the sprite in the canvas
    const drawSize = canvas.width * SPRITE_SCALE;
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
}

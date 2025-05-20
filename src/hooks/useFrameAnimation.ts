import { useState, useEffect } from "react";
import actions from "@/const/actions";

// Animation speed in milliseconds
export const ANIMATION_SPEED_MS = 70;

/**
 * Custom hook to handle animation frame cycling
 */
export function useFrameAnimation(
  action: keyof typeof actions,
  isAnimating: boolean,
  isLoading: boolean
) {
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animation loop effect - only run when isAnimating is true
  useEffect(() => {
    if (isLoading || !isAnimating) return;

    const interval = setInterval(() => {
      setAnimationFrame((current) =>
        current >= actions[action].animationFrameLength - 1 ? 0 : current + 1
      );
    }, ANIMATION_SPEED_MS);

    return () => clearInterval(interval);
  }, [action, isLoading, isAnimating]);

  // Reset animation frame when not animating
  useEffect(() => {
    if (!isAnimating) {
      setAnimationFrame(0);
    }
  }, [isAnimating]);

  return animationFrame;
}

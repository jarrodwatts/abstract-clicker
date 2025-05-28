import { useState, useEffect, useRef } from "react";
import actions from "@/const/actions";

// Base animation speed in milliseconds (slower)
export const BASE_ANIMATION_SPEED_MS = 120;

/**
 * Custom hook to handle animation frame cycling
 * @param action - The action to animate
 * @param isAnimating - Whether the animation is currently playing
 * @param isLoading - Whether the animation is in a loading state
 */
export function useFrameAnimation(
  action: keyof typeof actions,
  isAnimating: boolean,
  isLoading: boolean,
) {
  const animationFrameRef = useRef(0); // Internal logic for current frame index
  const [currentFrame, setCurrentFrame] = useState(0); // Stateful frame for rendering

  // Animation loop effect
  useEffect(() => {
    if (isLoading || !isAnimating) {
      // Ensure frame resets for rendering when animation stops or is loading
      if (animationFrameRef.current !== 0) animationFrameRef.current = 0;
      if (currentFrame !== 0) setCurrentFrame(0);
      return;
    }

    const interval = setInterval(() => {
      const nextFrame =
        animationFrameRef.current >= actions[action].animationFrameLength - 1
          ? 0
          : animationFrameRef.current + 1;
      animationFrameRef.current = nextFrame;
      setCurrentFrame(nextFrame); // Update stateful frame to trigger re-render
    }, BASE_ANIMATION_SPEED_MS);

    return () => clearInterval(interval);
  }, [action, isLoading, isAnimating, currentFrame]); // Added currentFrame to ensure reset logic is covered if it was changed externally somehow, though primarily driven by internal state

  // Reset animation frame state when not animating or when action changes
  useEffect(() => {
    animationFrameRef.current = 0;
    setCurrentFrame(0);
  }, [isAnimating, action]); // Reset on action change too

  return { currentFrame }; // Return stateful frame
}

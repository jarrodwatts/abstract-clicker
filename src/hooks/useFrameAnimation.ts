import { useState, useEffect, useRef, useCallback } from "react";
import actions from "@/const/actions";

// Base animation speed in milliseconds (slower)
export const BASE_ANIMATION_SPEED_MS = 120;
// Minimum animation speed (faster but not too fast)
export const MIN_ANIMATION_SPEED_MS = 30;
// Click tracking duration in ms
const CLICK_TRACKING_WINDOW = 1500;
// How much each click/second reduces animation speed
const SPEED_REDUCTION_PER_CLICK = 10;

/**
 * Custom hook to handle animation frame cycling
 * @param action - The action to animate
 * @param isAnimating - Whether the animation is currently playing
 * @param isLoading - Whether the animation is in a loading state
 * @param clickCount - A counter that increments with each click
 */
export function useFrameAnimation(
  action: keyof typeof actions,
  isAnimating: boolean,
  isLoading: boolean,
  clickCount: number = 0
) {
  const animationFrameRef = useRef(0); // Internal logic for current frame index
  const [currentFrame, setCurrentFrame] = useState(0); // Stateful frame for rendering
  const [animationSpeed, setAnimationSpeed] = useState(BASE_ANIMATION_SPEED_MS);
  const clickTimestamps = useRef<number[]>([]);
  const prevClickCount = useRef(clickCount);
  const speedDecayTimer = useRef<NodeJS.Timeout | null>(null);

  // Function to record a click and update animation speed
  const recordClick = useCallback(() => {
    // Add current timestamp to click history
    const now = Date.now();
    clickTimestamps.current.push(now);

    // Only keep clicks within the tracking window
    const recentClicks = clickTimestamps.current.filter(
      (timestamp) => now - timestamp < CLICK_TRACKING_WINDOW
    );
    clickTimestamps.current = recentClicks;

    // Calculate clicks per second - more accurate with shorter window
    const clicksPerSecond =
      recentClicks.length / (CLICK_TRACKING_WINDOW / 1000);

    // Scale animation speed with a more moderate effect
    // More clicks = faster animation, but with a gentler curve
    const newSpeed = Math.max(
      MIN_ANIMATION_SPEED_MS,
      BASE_ANIMATION_SPEED_MS - clicksPerSecond * SPEED_REDUCTION_PER_CLICK
    );

    setAnimationSpeed(newSpeed);

    // Clear existing decay timer
    if (speedDecayTimer.current) {
      clearTimeout(speedDecayTimer.current);
    }

    // Set timer to reset speed after clicks stop
    speedDecayTimer.current = setTimeout(() => {
      setAnimationSpeed(BASE_ANIMATION_SPEED_MS);
    }, CLICK_TRACKING_WINDOW);
  }, []);

  // React to clickCount changes - this detects EVERY click
  useEffect(() => {
    // Only record if the clickCount actually changed
    if (clickCount !== prevClickCount.current) {
      prevClickCount.current = clickCount;
      recordClick();
    }
  }, [clickCount, recordClick]);

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
    }, animationSpeed);

    return () => clearInterval(interval);
  }, [action, isLoading, isAnimating, animationSpeed, currentFrame]); // Added currentFrame to ensure reset logic is covered if it was changed externally somehow, though primarily driven by internal state

  // Reset animation frame state when not animating or when action changes
  useEffect(() => {
    animationFrameRef.current = 0;
    setCurrentFrame(0);
  }, [isAnimating, action]); // Reset on action change too

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (speedDecayTimer.current) {
        clearTimeout(speedDecayTimer.current);
      }
    };
  }, []);

  return { currentFrame, animationSpeed }; // Return stateful frame and speed
}

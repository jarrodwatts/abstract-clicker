"use client";

import { useEffect, useRef, useState } from "react";
import { renderNatureTile } from "@/utils/natureImages";
import AnimationPreview from "@/components/AnimationPreview";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import Character from "@/types/Character";
import useClickGasEstimate from "@/hooks/useClickGasEstimate";
import useTransactionNonce from "@/hooks/useTransactionNonce";
import { useAbstractSession } from "@/hooks/useAbstractSession";
import { privateKeyToAccount } from "viem/accounts";
import signClickTx from "@/lib/transaction/sendClickTx";
import { useAccount } from "wagmi";

export default function MiningGame({
  character: initialCharacter,
}: {
  character?: Character;
}) {
  const { address } = useAccount();
  const { data: sessionData } = useAbstractSession();

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
    setIsAnimating(true);

    submitOptimisticTransaction();
    nonceQuery.incrementNonce();

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

  // Core game logic
  const gasEstimateQuery = useClickGasEstimate();
  const nonceQuery = useTransactionNonce();

  async function submitOptimisticTransaction() {
    const startTime = performance.now();

    if (!address) throw new Error("No AGW address found");
    if (!sessionData?.privateKey) throw new Error("No session signer found");
    if (!gasEstimateQuery.data) throw new Error("No gas estimate found");
    if (!nonceQuery.nonce) throw new Error("No nonce found");

    const signer = privateKeyToAccount(sessionData.privateKey);

    await signClickTx(
      address,
      signer,
      sessionData.session,
      nonceQuery.nonce
      // gasEstimateQuery.data
    );

    const endTime = performance.now();

    console.log(`⏱️: ${(endTime - startTime).toFixed(2)}ms`);
  }

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

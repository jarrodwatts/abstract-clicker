"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import { useAbstractSession } from "@/hooks/useAbstractSession";
import { useCreateAbstractSession } from "@/hooks/useCreateAbstractSession";
import AnimationPreview from "./AnimationPreview";
import MiningGame from "./MiningGame";
import { Button } from "./ui/button";

export default function LoginFlow() {
  // Generate a random character on component mount
  const [character] = useState(() => generateRandomCharacter());

  // Track if we've initiated session creation
  const [hasInitiatedSessionCreation, setHasInitiatedSessionCreation] =
    useState(false);

  // Get wallet connection state
  const { address, status } = useAccount();
  const isWalletConnecting =
    status === "connecting" || status === "reconnecting";
  const { login } = useLoginWithAbstract();

  // Get session state
  const { data: session, isLoading: isSessionLoading } = useAbstractSession();
  const { mutate: createSession, isPending: isCreatingSession } =
    useCreateAbstractSession();

  // Create session handler
  const handleCreateSession = () => {
    setHasInitiatedSessionCreation(true);
    createSession();
  };

  // Reset session creation tracking if there's an error or disconnect
  useEffect(() => {
    if (!address) {
      setHasInitiatedSessionCreation(false);
    }
  }, [address]);

  // If connected with session - show the mining game
  if (address && session) {
    return <MiningGame character={character} />;
  }

  // Main login flow container - consistent structure for all states
  return (
    <div
      className="w-full max-w-md mx-auto p-6 space-y-6 text-center flex flex-col items-center"
      style={{ minHeight: "350px" }}
    >
      <div className="mb-2">
        <h2
          className={`font-semibold text-[#5a4a1a] ${
            !address ? "text-2xl" : "text-xl"
          }`}
        >
          {!address
            ? "Axestract"
            : isSessionLoading
            ? "Checking session status..."
            : isCreatingSession || hasInitiatedSessionCreation
            ? "Creating session..."
            : "Create Session"}
        </h2>
        {!address && (
          <p className="text-[#5a4a1a] mt-2 opacity-80 whitespace-nowrap overflow-hidden text-ellipsis font-semibold">
            A demo game showcasing Abstract&rsquo;s new realtime endpoint.
          </p>
        )}
      </div>

      <div
        className="flex justify-center"
        style={{ minHeight: "200px", height: "200px" }}
      >
        <AnimationPreview
          character={character}
          action={
            // Pick appropriate animation based on state
            isCreatingSession || (hasInitiatedSessionCreation && !session)
              ? "pickaxe"
              : "walk"
          }
          isAnimating={
            // Animate in all states except initial connection state
            isWalletConnecting ||
            isSessionLoading ||
            isCreatingSession ||
            (hasInitiatedSessionCreation && !session) ||
            false
          }
        />
      </div>

      <div className="w-full h-10">
        {!address && (
          <button
            onClick={login}
            disabled={isWalletConnecting}
            className="w-full min-h-[48px] flex items-center justify-center gap-4 p-3 transition-colors bg-[#bfc98a] border-4 border-[#a86b2d] rounded-[32px] shadow-[12px_16px_32px_0_rgba(80,40,10,0.35)] relative cursor-pointer hover:bg-[#d4e0a0] hover:border-[#8b5a2b] hover:shadow-[8px_12px_24px_0_rgba(80,40,10,0.25)] disabled:opacity-50 disabled:cursor-not-allowed text-[#5a4a1a] font-bold"
          >
            Connect Abstract Global Wallet
          </button>
        )}

        {/* Show create session button when needed */}
        {address &&
          !isSessionLoading &&
          !isCreatingSession &&
          !hasInitiatedSessionCreation &&
          !session && (
            <button
              onClick={handleCreateSession}
              className="w-full min-h-[48px] flex items-center justify-center gap-4 p-3 transition-colors bg-[#bfc98a] border-4 border-[#a86b2d] rounded-[32px] shadow-[12px_16px_32px_0_rgba(80,40,10,0.35)] relative cursor-pointer hover:bg-[#d4e0a0] hover:border-[#8b5a2b] hover:shadow-[8px_12px_24px_0_rgba(80,40,10,0.25)] text-[#5a4a1a] font-bold"
            >
              Create Session
            </button>
          )}
      </div>
    </div>
  );
}

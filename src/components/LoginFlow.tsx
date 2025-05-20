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
      {/* Header section - always present */}
      <h2 className="text-xl font-semibold mb-4">
        {!address
          ? "Welcome to the Mining Game"
          : isSessionLoading
          ? "Checking session status..."
          : isCreatingSession || hasInitiatedSessionCreation
          ? "Creating session..."
          : "Create Session"}
      </h2>

      {/* Animation container - always the same height */}
      <div className="flex justify-center" style={{ minHeight: "200px" }}>
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

      {/* Button container - consistent height whether button is shown or not */}
      <div className="w-full h-10">
        {/* Show login button when not connected */}
        {!address && (
          <Button
            onClick={login}
            disabled={isWalletConnecting}
            className="w-full"
          >
            Connect Abstract Wallet
          </Button>
        )}

        {/* Show create session button when needed */}
        {address &&
          !isSessionLoading &&
          !isCreatingSession &&
          !hasInitiatedSessionCreation &&
          !session && (
            <Button onClick={handleCreateSession} className="w-full">
              Create Session
            </Button>
          )}
      </div>
    </div>
  );
}

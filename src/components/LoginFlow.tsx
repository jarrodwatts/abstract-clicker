"use client";

import { useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import { useAbstractSession } from "@/hooks/useAbstractSession";
import { useCreateAbstractSession } from "@/hooks/useCreateAbstractSession";
import AnimationPreview from "./AnimationPreview";
import MiningGame from "./MiningGame";

/**
 * Walk the user through a three step process to login and create a session before playing the game
 * 1. Connect wallet
 * 2. Create session
 * 3. Play the game
 * @returns
 */
export default function LoginFlow() {
  // Generate a random character to use throughout the login flow
  const [character] = useState(() => generateRandomCharacter());

  // 1. == Wallet Connection ==
  const { address, status } = useAccount();
  const isWalletConnecting =
    status === "connecting" || status === "reconnecting";
  const { login } = useLoginWithAbstract();
  const { error: connectError } = useConnect();

  // 2. == Session Creation ==
  const {
    data: session,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useAbstractSession();

  const {
    mutate: createSession,
    isPending: isCreatingSession,
    error: createSessionError,
  } = useCreateAbstractSession();

  // If connected with session - show the mining game
  if (address && session) {
    return <MiningGame character={character} />;
  }

  // Get the current status message
  const getStatusMessage = () => {
    // Handle idle states
    if (!address && !isWalletConnecting) return null;
    if (
      !session &&
      !isSessionLoading &&
      !isCreatingSession &&
      !isWalletConnecting
    )
      return null;

    // Handle loading states
    if (isWalletConnecting) return "Connecting wallet...";
    if (isSessionLoading) return "Checking session...";
    if (isCreatingSession) return "Creating session...";

    // Handle errors
    if (connectError) return "Failed to connect wallet. Please try again.";
    if (sessionError) return "Failed to load session. Please try again.";
    if (createSessionError)
      return "Failed to create session. Please try again.";

    return null;
  };

  const statusMessage = getStatusMessage();
  const hasError = connectError || sessionError || createSessionError;

  // Common button styles
  const buttonClassName =
    "w-full min-h-[48px] flex items-center justify-center gap-4 p-3 transition-transform duration-150 bg-[#fffbe6] border-4 border-[#a86b2d] rounded-[32px] shadow-[0_4px_16px_0_rgba(80,40,10,0.18)] relative cursor-pointer hover:bg-[#fffad1] hover:border-[#8b5a2b] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-[#5a4a1a] font-bold text-base md:text-lg";

  return (
    <div className="w-full max-w-md mx-auto p-0 space-y-6 text-center flex flex-col items-center min-h-[300px]">
      <div className="flex justify-center min-h-[200px] h-[200px]">
        <AnimationPreview
          character={character}
          action={!address ? "walk" : "axe"}
          isAnimating={
            isWalletConnecting ||
            isSessionLoading ||
            isCreatingSession ||
            !session
          }
        />
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-4">
        <div className="h-10">
          {!address && (
            <button
              onClick={() => login()}
              disabled={isWalletConnecting}
              className={buttonClassName}
            >
              Connect Wallet
            </button>
          )}

          {address && !session && (
            <button
              onClick={() => createSession()}
              disabled={isCreatingSession || isSessionLoading}
              className={buttonClassName}
            >
              Create Session
            </button>
          )}
        </div>

        {/* Status Message - Fixed height container */}
        <div className="h-6 mt-6 lg:mt-12">
          <div
            className={`text-sm transition-opacity duration-200 ${
              hasError ? "text-red-500" : "text-gray-600"
            } ${statusMessage ? "opacity-100" : "opacity-0"}`}
          >
            {/* Space character maintains height when empty */}
            {statusMessage || " "}{" "}
          </div>
        </div>
      </div>
    </div>
  );
}

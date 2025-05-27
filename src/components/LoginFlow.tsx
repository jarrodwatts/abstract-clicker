"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import { useAbstractSession } from "@/hooks/useAbstractSession";
import { useCreateAbstractSession } from "@/hooks/useCreateAbstractSession";
import AnimationPreview from "./AnimationPreview";
import MiningGame from "./MiningGame";

export default function LoginFlow() {
  // Generate a random character to use throughout the login flow
  const [character] = useState(() => generateRandomCharacter());

  // 1. == Wallet Connection ==
  const { address, status } = useAccount();
  const isWalletConnecting =
    status === "connecting" || status === "reconnecting";
  const { login } = useLoginWithAbstract();

  // 2. == Session Creation ==
  const { data: session, isLoading: isSessionLoading } = useAbstractSession();
  const { mutate: createSession, isPending: isCreatingSession } =
    useCreateAbstractSession();

  // If connected with session - show the mining game
  if (address && session) {
    return <MiningGame character={character} />;
  }

  // Otherwise, walk through the following states:
  // 1. Check if wallet is connected
  // -> If no, show connect wallet state
  // 2. Check if a valid session exists
  // -> If no, show create session state
  // If BOTH address & session are present, show null
  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 text-center flex flex-col items-center min-h-[350px]">
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

      <div className="w-full h-10">
        {!address && (
          <button
            onClick={login}
            disabled={isWalletConnecting}
            className="w-full min-h-[48px] flex items-center justify-center gap-4 p-3 transition-transform duration-150 bg-[#fffbe6] border-4 border-[#a86b2d] rounded-[32px] shadow-[0_4px_16px_0_rgba(80,40,10,0.18)] relative cursor-pointer hover:bg-[#fffad1] hover:border-[#8b5a2b] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-[#5a4a1a] font-bold text-base md:text-lg"
          >
            Connect Wallet
          </button>
        )}

        {/* Show create session button when needed */}
        {address && !isSessionLoading && !isCreatingSession && !session && (
          <button
            onClick={() => createSession()}
            className="w-full min-h-[48px] flex items-center justify-center gap-4 p-3 transition-colors bg-[#bfc98a] border-4 border-[#a86b2d] rounded-[32px] shadow-[12px_16px_32px_0_rgba(80,40,10,0.35)] relative cursor-pointer hover:bg-[#d4e0a0] hover:border-[#8b5a2b] hover:shadow-[8px_12px_24px_0_rgba(80,40,10,0.25)] text-[#5a4a1a] font-bold"
          >
            Create Session
          </button>
        )}
      </div>
    </div>
  );
}

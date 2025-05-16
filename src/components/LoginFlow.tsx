import { useAbstractSession } from "@/hooks/useAbstractSession";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import AnimationPreview from "./AnimationPreview";
import { useEffect, useState } from "react";
import generateRandomCharacter from "@/lib/render-character/generateRandomCharacter";
import Character from "@/types/Character";
import ClickerGame from "./ClickerGame";

export default function LoginFlow() {
  const { address, isConnecting, isReconnecting } = useAccount();
  const { login } = useLoginWithAbstract();
  const { hasValidSession, createAndStoreSession } = useAbstractSession();
  const [character, setCharacter] = useState<Character | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Generate a random character on component mount
  useEffect(() => {
    setCharacter(generateRandomCharacter());
  }, []);

  // Reset session loading when address changes
  useEffect(() => {
    if (address) {
      setIsSessionLoading(true);
      // Use a small timeout to give hasValidSession time to update
      const timer = setTimeout(() => {
        setIsSessionLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsSessionLoading(false);
    }
  }, [address]);

  console.log(isConnecting, isReconnecting, isSessionLoading);

  // Loading states - show walking animation
  if (isConnecting || isReconnecting || isSessionLoading) {
    return (
      <div className="flex flex-col items-center gap-4">
        {character && (
          <AnimationPreview
            character={character}
            action="walk"
            isAnimating={true}
          />
        )}
        <p>
          {isSessionLoading ? "Checking session..." : "Connecting wallet..."}
        </p>
      </div>
    );
  }

  // Not connected - show pickaxe animation
  if (!address) {
    return (
      <div className="flex flex-col items-center gap-4">
        {character && (
          <AnimationPreview
            character={character}
            action="pickaxe"
            isAnimating={true}
          />
        )}
        <Button onClick={login}>Connect Wallet</Button>
      </div>
    );
  }

  // No session - show pickaxe animation
  if (!hasValidSession) {
    return (
      <div className="flex flex-col items-center gap-4">
        {character && (
          <AnimationPreview
            character={character}
            action="pickaxe"
            isAnimating={true}
          />
        )}
        <Button onClick={createAndStoreSession}>Create Session</Button>
      </div>
    );
  }

  return <ClickerGame />;
}

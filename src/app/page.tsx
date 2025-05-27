"use client";

import LoginFlow from "@/components/LoginFlow";
import { DotPattern } from "@/components/DotPattern";
import Image from "next/image";
import { useAccount } from "wagmi";
import { useAbstractSession } from "@/hooks/useAbstractSession";

export default function Home() {
  const { address } = useAccount();
  const { data: session } = useAbstractSession();

  const isGameActive = address && session;

  return (
    <main className="flex flex-col items-center min-h-screen p-4 bg-[#87944d] relative font-[var(--font-press-start-2p)]">
      <div className="w-full flex justify-center pt-8 z-20">
        <Image
          src="/axestract.png"
          alt="Axestract Logo"
          width={400}
          height={100}
          priority
        />
      </div>

      {!isGameActive && (
        <div className="relative w-full z-20 mt-12 md:mt-32 flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.9)] tracking-wide uppercase text-center mb-2 md:mb-4 max-w-3xl mx-auto leading-[1.25]">
            Realtime Gaming on Abstract
          </h1>
          <p className="text-lg md:text-xl text-white font-mono text-center mb-6 lg:mt-6 mt-2 md:mb-10 max-w-2xl mx-auto">
            A demo game showcasing Abstract&rsquo;s new realtime endpoint.
          </p>
          <div className="w-full max-w-[650px] p-6 border-2 border-[#a86b2d] rounded-2xl shadow-[0_8px_32px_0_rgba(80,40,10,0.35)] bg-[#bfc98a]/60 backdrop-blur-sm text-center">
            <LoginFlow />
          </div>
        </div>
      )}

      {isGameActive && <LoginFlow />}

      <DotPattern className="[mask-image:radial-gradient(180%_180%_at_center,transparent,white)] z-1 absolute inset-0" />
    </main>
  );
}

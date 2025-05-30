"use client";

import Image from "next/image";
// import LoginFlow from "@/components/LoginFlow";
import { DotPattern } from "@/components/DotPattern";
// import { useAccount } from "wagmi";
// import { useAbstractSession } from "@/hooks/useAbstractSession";
// import { NumberTicker } from "@/components/magicui/number-ticker";
// import useTotalClicks from "@/hooks/useTotalClicks";

/**
 * The main page of the app that controls the login flow and the game
 * General flow is:
 * 1. Show the login flow
 * 2. Show the game
 */
export default function Home() {
  // const { address } = useAccount();
  // const { data: session } = useAbstractSession();
  // const { totalClicks, isLoading } = useTotalClicks();

  // const isGameActive = address && session;

  return (
    <main className="flex flex-col items-center min-h-screen p-4 bg-[#87944d] relative font-[var(--font-press-start-2p)]">
      <div className="w-full flex justify-center pt-8 pb-4 z-20">
        <Image
          src="/axestract.png"
          alt="Axestract Logo"
          width={400}
          height={100}
          priority
        />
      </div>

      {/* {!isGameActive && (
        <div className="relative w-full z-20 flex flex-col items-center flex-grow justify-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.9)] tracking-wide uppercase text-center mb-2 md:mb-4 max-w-3xl mx-auto leading-[1.25] mt-2">
            Realtime Gaming on Abstract
          </h1>
          <p className="text-lg md:text-xl text-white font-mono text-center mb-2 lg:mt-2 mt-2 max-w-2xl mx-auto">
            A demo game showcasing Abstract&rsquo;s new realtime endpoint
          </p>
          <div className="w-full flex items-center justify-center gap-2 text-[#fbec4f] font-bold mb-8 md:mb-10 drop-shadow-[2px_2px_0_rgba(0,0,0,0.9)]">
            {isLoading ? (
              <span className="text-xl sm:text-2xl text-center">
                Loading...
              </span>
            ) : (
              <div className="text-xl sm:text-2xl text-center">
                <NumberTicker
                  value={totalClicks}
                  decimalPlaces={0}
                  className="inline"
                />{" "}
                clicks so far.
              </div>
            )}
          </div>
          <div className="w-full max-w-[600px] p-1 md:p-6 border-2 border-[#a86b2d] rounded-2xl shadow-[0_8px_32px_0_rgba(80,40,10,0.35)] bg-[#bfc98a]/60 backdrop-blur-sm text-center">
            <LoginFlow />
          </div>
        </div>
      )}

      {isGameActive && (
        <div className="flex-grow flex items-center justify-center w-full">
          <LoginFlow />
        </div>
      )} */}

      <div className="relative w-full z-20 flex flex-col items-center flex-grow justify-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.9)] tracking-wide uppercase text-center mb-2 md:mb-4 max-w-3xl mx-auto leading-[1.25] mt-2">
          Maintenance in Progress
        </h1>
        <p className="text-lg md:text-xl text-white font-mono text-center mb-2 lg:mt-2 mt-2 max-w-2xl mx-auto">
          We&apos;re currently performing some maintenance. Please check back
          soon!
        </p>
        {/* <div className="w-full max-w-[600px] p-1 md:p-6 border-2 border-[#a86b2d] rounded-2xl shadow-[0_8px_32px_0_rgba(80,40,10,0.35)] bg-[#bfc98a]/60 backdrop-blur-sm text-center"> */}
        {/* <div className="flex flex-col items-center gap-4"> */}
        {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a86b2d]"></div> */}
        {/* </div> */}
        {/* </div> */}
      </div>

      <DotPattern className="[mask-image:radial-gradient(180%_180%_at_center,transparent,white)] z-1 absolute inset-0" />
    </main>
  );
}

"use client";

import LoginFlow from "@/components/LoginFlow";
import { DotPattern } from "@/components/DotPattern";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#87944d] relative border-2 border-red-500">
      <DotPattern className="[mask-image:radial-gradient(180%_180%_at_center,transparent,white)]" />
      <LoginFlow />
    </main>
  );
}

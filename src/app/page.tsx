"use client";

import ClickerGame from "@/components/ClickerGame";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <h1 className="text-2xl font-bold mb-6">Mining Clicker Game</h1>
      <ClickerGame />
    </main>
  );
}

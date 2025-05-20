"use client";

import { useEffect, useRef } from "react";
import LoginFlow from "@/components/LoginFlow";
import { NatureCategory, renderNatureTile } from "@/utils/natureImages";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderTiles = async () => {
      if (!canvasRef.current) return;

      try {
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        // Render tiles with a single function call
        await renderNatureTile(ctx, "Soapstone", 0, 0);
        await renderNatureTile(ctx, "Soapstone", 0, 16);
        await renderNatureTile(ctx, "Soapstone", 0, 32);
        await renderNatureTile(ctx, "Soapstone", 0, 48);
        await renderNatureTile(ctx, "Soapstone", 0, 64);
        await renderNatureTile(ctx, "Soapstone", 0, 80);

        await renderNatureTile(ctx, "Apple Tree", 16, 0);
        await renderNatureTile(ctx, "Pear Tree", 16, 32);
        await renderNatureTile(ctx, "Birch Tree", 16, 64);
      } catch (error) {
        console.error("Failed to render nature tiles", error);
      }
    };

    renderTiles();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#87944d]">
      <h1 className="text-2xl font-bold mb-6">Mining Clicker Game</h1>
      <canvas
        ref={canvasRef}
        width={100}
        height={100}
        className="border border-black"
      />
      <LoginFlow />
    </main>
  );
}

"use client";

import { chain } from "@/const/chain";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { QueryClient } from "@tanstack/react-query";
// import { http } from "viem";

// // Create a transport that logs requests
// const transport = http(chain.rpcUrls.default.http[0]);

// // Add request logging
// const originalFetch = global.fetch;
// global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
//   if (
//     typeof input === "string" &&
//     input.includes(chain.rpcUrls.default.http[0])
//   ) {
//     // Intercept eth_chainId calls and return the configured chain ID
//     if (init?.body) {
//       const body = JSON.parse(init.body as string);
//       if (body.method === "eth_chainId") {
//         console.log(`RPC Request - eth_chainId - (OVERRIDDEN)`);

//         // Override behaviour to fetch chain ID from the chain, and just return it.
//         const response = {
//           jsonrpc: "2.0",
//           result: `0x${abstractTestnet.id.toString(16)}`,
//         };

//         return new Response(JSON.stringify(response), {
//           headers: { "Content-Type": "application/json" },
//         });
//       }
//     }

//     const startTime = performance.now();
//     console.log("RPC Request:", {
//       url: input,
//       body: init?.body ? JSON.parse(init.body as string) : undefined,
//     });

//     const response = await originalFetch(input, init);

//     if (
//       typeof input === "string" &&
//       input.includes(abstractTestnet.rpcUrls.default.http[0])
//     ) {
//       const clone = response.clone();
//       const data = await clone.json();
//       const endTime = performance.now();
//       console.log("RPC Response:", {
//         ...data,
//         duration: `${(endTime - startTime).toFixed(2)}ms`,
//       });
//     }
//     return response;
//   }
//   return originalFetch(input, init);
// };

export const queryClient = new QueryClient();

export default function AbstractWalletWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AbstractWalletProvider
      chain={chain}
      queryClient={queryClient}
      // transport={transport}
    >
      {children}
    </AbstractWalletProvider>
  );
}

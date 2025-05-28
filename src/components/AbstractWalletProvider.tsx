"use client";

import { chain } from "@/const/chain";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { QueryClient } from "@tanstack/react-query";

/** TanStack query client, used to manage state like session keys */
export const queryClient = new QueryClient();

/**
 * Wrap the entire app in the Abstract Wallet Wrapper
 * https://docs.abs.xyz/abstract-global-wallet/agw-react/AbstractWalletProvider
 */
export default function AbstractWalletWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AbstractWalletProvider chain={chain} queryClient={queryClient}>
      {children}
    </AbstractWalletProvider>
  );
}

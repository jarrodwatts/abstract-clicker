"use client";

import { chain } from "@/const/chain";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

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

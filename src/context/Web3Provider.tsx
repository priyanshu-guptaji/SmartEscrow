'use client';

import React from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { baseSepolia, localhost } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [baseSepolia, localhost],
  connectors: [
    injected(), // metamask/standard browser extensions
    coinbaseWallet({ appName: 'SmartEscrow' }),
  ],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || undefined),
    [localhost.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ChevronDown, Wallet } from 'lucide-react';
import { useHydrated } from '@/lib/use-hydrated';

export function WalletControl() {
  const mounted = useHydrated();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const metaMaskConnector = connectors.find((connector) => connector.id === 'metaMask');

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white opacity-60"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        title="Disconnect wallet"
        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-blue-500/60"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
        <ChevronDown className="h-4 w-4 text-zinc-500" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={!metaMaskConnector || isPending}
        onClick={() => metaMaskConnector && connect({ connector: metaMaskConnector })}
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Wallet className="h-4 w-4" />
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <p role="alert" className="max-w-xs text-right text-xs text-red-400">{error.message}</p>}
      {!metaMaskConnector && (
        <p className="max-w-xs text-right text-xs text-zinc-400">
          MetaMask connector is unavailable. Reload the page and try again.
        </p>
      )}
    </div>
  );
}

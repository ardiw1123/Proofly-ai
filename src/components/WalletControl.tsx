'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { AlertTriangle, ChevronDown, Loader2, Wallet } from 'lucide-react';
import { useHydrated } from '@/lib/use-hydrated';
import { botChain } from '@/lib/contract';

export function WalletControl() {
  const mounted = useHydrated();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
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

  const isWrongNetwork = isConnected && chainId !== botChain.id;

  if (isConnected && address) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {isWrongNetwork ? (
            <button
              type="button"
              onClick={() => switchChain({ chainId: botChain.id })}
              disabled={isSwitching}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
            >
              {isSwitching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              )}
              Switch to {botChain.name}
            </button>
          ) : (
            <span className="hidden items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-400 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {botChain.name}
            </span>
          )}

          <button
            type="button"
            onClick={() => disconnect()}
            title="Disconnect wallet"
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-blue-500/60"
          >
            <span className={`h-2 w-2 rounded-full ${isWrongNetwork ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {`${address.slice(0, 6)}...${address.slice(-4)}`}
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
        {switchError && (
          <p role="alert" className="max-w-xs text-right text-xs text-amber-400">
            {switchError.message}
          </p>
        )}
      </div>
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Award, ChevronDown } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Assessments' },
  { href: '/badges', label: 'My Badges' },
  { href: '/verify', label: 'Verify' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="justify-self-start">
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400">
              <Award className="h-5 w-5 text-white" />
            </span>
            <span className="leading-tight">
              <span className="block text-xl font-bold tracking-tighter text-white">
                ProofOfSkill
              </span>
              <span className="block text-xs text-zinc-500">BOT Chain</span>
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? 'text-blue-400'
                    : 'text-zinc-300 transition-colors hover:text-blue-400'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="justify-self-end">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openConnectModal,
              mounted,
            }) => {
              const connected = mounted && Boolean(account && chain);

              return (
                <div
                  className={mounted ? 'transition-opacity' : 'pointer-events-none opacity-0'}
                >
                  {connected ? (
                    <button
                      type="button"
                      onClick={openAccountModal}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-blue-500/60"
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {account?.displayName}
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.45)]"
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </nav>
  );
}

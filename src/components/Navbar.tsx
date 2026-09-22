'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Award } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Assessments' },
  { href: '/badges', label: 'My Badges' },
  { href: '/verify', label: 'Verify' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400">
            <Award className="h-5 w-5 text-white" />
          </span>
          <span className="leading-tight">
            <span className="block text-xl font-bold tracking-tighter text-white">
              ProofOfSkill
            </span>
            <span className="block text-xs text-zinc-500">BOT Chain</span>
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

        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>
    </nav>
  );
}

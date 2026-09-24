'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { WalletControl } from '@/components/WalletControl';
import { botChain } from '@/lib/contract';

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
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
              <Image
                src="/logo.png"
                alt="Proofly Logo"
                width={40}
                height={40}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span className="leading-tight">
              <span className="block text-xl font-bold tracking-tight text-white">
                Proofly
              </span>
              <span className="block text-xs text-zinc-500">{botChain.name}</span>
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
          <WalletControl />
        </div>
      </div>
    </nav>
  );
}

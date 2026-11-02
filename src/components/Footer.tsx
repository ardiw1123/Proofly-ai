import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

const BOT_CHAIN_URL = 'https://www.botchain.ai/en/';
const BOT_SCAN_URL =
  process.env.NEXT_PUBLIC_BOT_CHAIN_EXPLORER ?? 'https://scan.botchain.ai/';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 text-center text-sm text-zinc-500 sm:flex-row sm:justify-between sm:text-left">
        <p>Powered by BOT Chain Ecosystem</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={BOT_CHAIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-full border border-zinc-800 px-4 py-1.5 transition-colors hover:border-teal-500/50 hover:text-teal-400"
          >
            <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden">
              <Image
                src="/bot-chain-logo.png"
                alt="BOT Chain Logo"
                width={20}
                height={20}
                className="h-full w-full object-contain"
              />
            </span>
            BOT Chain
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <a
            href={BOT_SCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-full border border-zinc-800 px-4 py-1.5 transition-colors hover:border-teal-500/50 hover:text-teal-400"
          >
            <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden">
              <Image
                src="/bot-chain-logo.png"
                alt="BOT Scan Logo"
                width={20}
                height={20}
                className="h-full w-full object-contain"
              />
            </span>
            BOT Scan
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}

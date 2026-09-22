import { ExternalLink } from 'lucide-react';

const EXPLORER_URL =
  process.env.NEXT_PUBLIC_BOT_CHAIN_EXPLORER ?? 'https://explorer.botchain.ai';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 text-center text-sm text-zinc-500 sm:flex-row sm:justify-between sm:text-left">
        <p>Powered by BOT Chain Ecosystem</p>

        <a
          href={EXPLORER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-1.5 transition-colors hover:border-blue-500/50 hover:text-blue-400"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-[9px] font-bold text-white">
            B
          </span>
          BOT Chain
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Verify Profile — ProofOfSkill",
};

export default function VerifyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900">
        <ShieldCheck className="h-7 w-7 text-emerald-400" />
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">Verify Profile</h1>
      <p className="mt-3 max-w-md text-zinc-400">
        Public wallet verification lands with the soulbound minting flow. It will live at{" "}
        <code className="font-mono text-xs text-zinc-300">/verify/&lt;walletAddress&gt;</code>.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assessments
      </Link>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Award, Code, Cpu, Database, Sparkles, Target } from "lucide-react";

import { SKILL_TRACKS } from "@/types";

const SKILL_ICONS: Record<number, React.ReactNode> = {
  1: <Database className="h-7 w-7 text-blue-400" />,
  2: <Code className="h-7 w-7 text-emerald-400" />,
  3: <Cpu className="h-7 w-7 text-purple-400" />,
};

const SKILL_GRADIENTS: Record<number, string> = {
  1: "from-blue-500 to-cyan-400",
  2: "from-emerald-500 to-teal-400",
  3: "from-purple-500 to-violet-400",
};

const HIGHLIGHTS = [
  {
    icon: <Sparkles className="h-5 w-5 text-blue-400" />,
    title: "Dynamic case studies",
    description: "GPT-4o invents a fresh business scenario with three progressive problems per session.",
  },
  {
    icon: <Target className="h-5 w-5 text-emerald-400" />,
    title: "Independent evaluation",
    description: "An AI Technical Lead scores logic, efficiency, edge cases, and syntax out of 100.",
  },
  {
    icon: <Award className="h-5 w-5 text-purple-400" />,
    title: "Soulbound proof",
    description: "Pass with 80 or higher and the result becomes a permanent on-chain credential.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <section className="text-center">
        <div className="inline-flex items-center gap-2 rounded-3xl border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-sm text-blue-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          AI-evaluated · 3 problems per session
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tighter text-white sm:text-6xl">
          Prove your skills.
          <br />
          On chain.
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400 sm:text-xl">
          Pick a track, solve an AI-generated case study, and get scored by an independent
          Technical Lead. No two candidates get the same exam.
        </p>
      </section>

      <section className="mt-14 grid gap-6 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950">
              {item.icon}
            </span>
            <h2 className="mt-4 font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500">Choose your track</h2>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SKILL_TRACKS.map((track) => (
            <div
              key={track.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50"
            >
              <div className={`h-1.5 bg-gradient-to-r ${SKILL_GRADIENTS[track.id]}`} />

              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950">
                    {SKILL_ICONS[track.id]}
                  </span>
                  <span className="font-mono text-3xl font-bold text-zinc-700">
                    #{track.id}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-white">{track.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-zinc-400">
                  {track.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {track.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/assessment/${track.id}`}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-medium text-white transition-all hover:bg-blue-500 group-hover:gap-3"
                >
                  Start assessment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-14 text-center text-sm text-zinc-500">
        Three problems per session · Scored 0-100 · Passing grade 80
      </p>
    </div>
  );
}

import Image from "next/image";
import { ArrowRight, Award, Code, Database, Cpu } from "lucide-react";

const SKILLS = [
  {
    id: 1,
    title: "SQL for Data Analytics",
    description: "E-commerce transactional analytics, aggregation queries, window functions, CTEs, and performance optimization.",
    icon: <Database className="w-8 h-8 text-blue-500" />,
    color: "from-blue-500 to-cyan-400",
    image: "/file.svg"
  },
  {
    id: 2,
    title: "Python for Data Manipulation",
    description: "Financial data cleansing with Pandas/Polars, feature engineering, outlier handling, and vectorized operations.",
    icon: <Code className="w-8 h-8 text-emerald-500" />,
    color: "from-emerald-500 to-teal-400",
    image: "/file.svg"
  },
  {
    id: 3,
    title: "Solidity & Smart Contracts",
    description: "DeFi and tokenized state management, reentrancy prevention, access control, gas optimization, and storage patterns.",
    icon: <Cpu className="w-8 h-8 text-purple-500" />,
    color: "from-purple-500 to-violet-400",
    image: "/file.svg"
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-2xl tracking-tighter">ProofOfSkill</span>
              <span className="text-xs text-zinc-500 block -mt-1">BOT Chain</span>
            </div>
          </div>

          <div className="flex items-center gap-8 text-sm">
            <a href="#" className="hover:text-blue-400 transition-colors">Assessments</a>
            <a href="#" className="hover:text-blue-400 transition-colors">My Badges</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Verify</a>
          </div>

          <button className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-2xl font-medium hover:scale-105 active:scale-95 transition-all">
            Connect Wallet
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-zinc-900 text-blue-400 text-sm px-4 py-1.5 rounded-3xl mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Testnet Live • 1 BOT Fee
          </div>
          
          <h1 className="text-6xl font-bold tracking-tighter mb-4">
            Prove Your Skills.<br />On Chain.
          </h1>
          <p className="text-2xl text-zinc-400 max-w-2xl mx-auto">
            AI-generated technical challenges. Soulbound badges. Permanent proof of competence.
          </p>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SKILLS.map((skill) => (
            <div key={skill.id} className="group bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1">
              <div className={`h-2 bg-gradient-to-r ${skill.color}`} />
              
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
                    {skill.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-widest text-zinc-500">Skill Track</div>
                    <div className="text-4xl font-mono font-bold text-white mt-1">#{skill.id}</div>
                  </div>
                </div>

                <h3 className="text-2xl font-semibold mb-2">{skill.title}</h3>
                <p className="text-zinc-400 mb-8">{skill.description}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-emerald-400 font-medium">Status</div>
                    <div className="text-3xl font-semibold text-white">Locked</div>
                  </div>
                  
                  <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors px-8 py-4 rounded-2xl font-medium group-hover:scale-105 active:scale-95">
                    Start Assessment
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center mt-16 text-zinc-500 text-sm">
          All assessments cost 1 BOT token • 24h cooldown between attempts
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
          Powered by BOT Chain Ecosystem • Made for Hackathon 2026
        </div>
      </footer>
    </div>
  );
}
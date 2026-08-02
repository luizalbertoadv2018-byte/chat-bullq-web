'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bot, BarChart3, User, Sparkles, Wrench, Activity, ShieldCheck } from 'lucide-react';
import { AgentsManager } from '@/features/ai-agents/components/agents-manager';
import { JarvisOverviewTab } from '@/features/ai-agents/components/jarvis/overview-tab';
import { JarvisAgentTab } from '@/features/ai-agents/components/jarvis/agent-tab';
import { JarvisSkillsTab } from '@/features/ai-agents/components/jarvis/skills-tab';
import { JarvisToolsTab } from '@/features/ai-agents/components/jarvis/tools-tab';
import { JarvisRunsTab } from '@/features/ai-agents/components/jarvis/runs-tab';
import { JarvisWatchdogTab } from '@/features/ai-agents/components/jarvis/watchdog-tab';
import { cn } from '@/lib/utils';

type Tab = 'agents' | 'overview' | 'skills' | 'tools' | 'agent' | 'runs' | 'watchdog';

const TAB_META: Record<Tab, { label: string; icon: React.ElementType }> = {
  agents: { label: 'Agentes', icon: Bot },
  overview: { label: 'Visão geral', icon: BarChart3 },
  skills: { label: 'Skills', icon: Sparkles },
  tools: { label: 'Tools', icon: Wrench },
  runs: { label: 'Execuções', icon: Activity },
  watchdog: { label: 'Watchdog', icon: ShieldCheck },
  agent: { label: 'Por agente', icon: User },
};

// Ordem das abas na barra (Agentes primeiro, como na LiderHub).
const TAB_ORDER: Tab[] = ['agents', 'overview', 'skills', 'tools', 'runs', 'watchdog', 'agent'];

export default function AiAgentsPage() {
  const searchParams = useSearchParams();
  const raw = (searchParams.get('tab') ?? 'agents') as Tab;
  const tab: Tab = TAB_ORDER.includes(raw) ? raw : 'agents';

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 bg-white px-6 pt-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <Bot className="h-5 w-5 text-primary" />
          Automações
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span className="text-zinc-500">Agentes</span>
        </h1>

        {/* Barra de abas do Jarvis (navegação via ?tab=) */}
        <div className="mt-3 flex items-stretch gap-1 overflow-x-auto scrollbar-none">
          {TAB_ORDER.map((t) => {
            const meta = TAB_META[t];
            const Icon = meta.icon;
            const active = tab === t;
            return (
              <Link
                key={t}
                href={`/ai-agents?tab=${t}`}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
                )}
              >
                <Icon className="h-4 w-4" />
                {meta.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'agents' && <AgentsManager />}
        {tab === 'overview' && <JarvisOverviewTab />}
        {tab === 'skills' && <JarvisSkillsTab />}
        {tab === 'tools' && <JarvisToolsTab />}
        {tab === 'runs' && <JarvisRunsTab />}
        {tab === 'watchdog' && <JarvisWatchdogTab />}
        {tab === 'agent' && <JarvisAgentTab />}
      </div>
    </div>
  );
}

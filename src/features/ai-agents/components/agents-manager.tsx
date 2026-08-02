'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  ChevronRight,
  Folder,
  Bot,
  LayoutList,
  Network,
  MoreHorizontal,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { aiAgentsService, type AiAgent } from '../services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { CreateAgentDialog } from './create-agent-dialog';
import { AgentsList } from './agents-list';
import { cn } from '@/lib/utils';

// Templates de agentes prontos para o nicho previdenciário (estilo LiderHub).
// Ao clicar, abre o criador de agente — o operador ajusta a partir daí.
const TEMPLATES: { name: string; desc: string; emoji: string; agents: string }[] = [
  { name: 'Triagem', emoji: '🧭', desc: 'Recepção e triagem inicial de leads', agents: '1 agente' },
  { name: 'Salário-Maternidade', emoji: '🤱', desc: 'Recepção → Proposta → Fechamento', agents: '3 agentes' },
  { name: 'BPC / LOAS', emoji: '♿', desc: 'Atendimento de benefício assistencial', agents: '3 agentes' },
  { name: 'Aposentadoria', emoji: '👵', desc: 'Idade, tempo de contribuição, revisão', agents: '2 agentes' },
  { name: 'Auxílio-Doença', emoji: '🩺', desc: 'Incapacidade temporária e perícia', agents: '3 agentes' },
];

function relativeDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'há 1 mês' : `há ${months} meses`;
}

function AgentAvatar({ agent }: { agent: AiAgent }) {
  const [failed, setFailed] = useState(false);
  if (agent.avatarUrl && !failed) {
    return (
      <img
        src={agent.avatarUrl}
        alt={agent.name}
        onError={() => setFailed(true)}
        className="h-9 w-9 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
      />
    );
  }
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        agent.kind === 'ORCHESTRATOR'
          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300',
      )}
    >
      {(agent.name || '??').slice(0, 2).toUpperCase()}
    </div>
  );
}

function AgentRow({ agent, onClick }: { agent: AiAgent; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40"
    >
      <span className="relative">
        <AgentAvatar agent={agent} />
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900',
            agent.isActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600',
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {agent.name}
          </span>
          {agent.kind === 'ORCHESTRATOR' && (
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              Orquestrador
            </span>
          )}
        </span>
        {agent.description && (
          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {agent.description}
          </span>
        )}
      </span>
      <span className="hidden shrink-0 text-xs text-zinc-400 sm:block">
        {relativeDate(agent.updatedAt)}
      </span>
      <MoreHorizontal className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
    </button>
  );
}

function Folder_({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-zinc-50/70 px-4 py-2.5 text-left dark:bg-zinc-900/60"
      >
        <ChevronRight
          className={cn('h-4 w-4 text-zinc-400 transition-transform', open && 'rotate-90')}
        />
        <Folder className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{label}</span>
        <span className="text-xs text-zinc-400">
          {count} agente{count === 1 ? '' : 's'}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export function AgentsManager() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [view, setView] = useState<'list' | 'org'>('list');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['ai-agents'] });

  // Agrupa por departamento (= "pasta"); sem departamento vira "Sem pasta".
  const folders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (a: AiAgent) =>
      !q ||
      a.name.toLowerCase().includes(q) ||
      (a.description ?? '').toLowerCase().includes(q);
    const byDept = new Map<string, AiAgent[]>();
    for (const a of agents) {
      if (!match(a)) continue;
      const key = a.department || 'Sem pasta';
      (byDept.get(key) ?? byDept.set(key, []).get(key)!).push(a);
    }
    return [...byDept.entries()].sort((a, b) =>
      a[0] === 'Sem pasta' ? 1 : b[0] === 'Sem pasta' ? -1 : a[0].localeCompare(b[0]),
    );
  }, [agents, search]);

  if (view === 'org') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-6 pt-4">
          <ViewToggle view={view} setView={setView} />
        </div>
        <div className="min-h-0 flex-1">
          <AgentsList />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Agentes</h2>
          <p className="mt-1 text-sm text-zinc-500">Crie e organize seus agentes de IA.</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} setView={setView} />
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Criar
          </button>
        </div>
      </div>

      {/* Templates de Agentes */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Templates de Agentes</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => setShowCreate(true)}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.name}</span>
              <span className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{t.desc}</span>
              <span className="mt-2 text-[10px] font-medium text-primary">{t.agents}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Busca */}
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar pastas e agentes..."
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* Pastas + agentes */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-zinc-200 p-16 dark:border-zinc-800">
            <Bot className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Nenhum agente ainda
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar primeiro agente
            </button>
          </div>
        ) : (
          folders.map(([dept, list]) => (
            <Folder_ key={dept} label={dept} count={list.length}>
              {list.map((a) => (
                <AgentRow key={a.id} agent={a} onClick={() => router.push(`/ai-agents/${a.id}`)} />
              ))}
            </Folder_>
          ))
        )}
      </div>

      <CreateAgentDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={refresh} />
    </div>
  );
}

function ViewToggle({
  view,
  setView,
}: {
  view: 'list' | 'org';
  setView: (v: 'list' | 'org') => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
      <button
        onClick={() => setView('list')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          view === 'list'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
        )}
      >
        <LayoutList className="h-3.5 w-3.5" />
        Lista
      </button>
      <button
        onClick={() => setView('org')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          view === 'org'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
        )}
      >
        <Network className="h-3.5 w-3.5" />
        Organograma
      </button>
    </div>
  );
}

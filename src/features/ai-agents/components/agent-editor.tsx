'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  X,
  Trash2,
  Bot,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  aiAgentsService,
  CURATED_MODELS,
  DEFAULT_AGENT_MODEL,
  DEPARTMENTS,
  type AiAgent,
  type AgentMode,
} from '../services/ai-agents.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { AgentSkillsAndTools } from './edit-agent-dialog';
import { cn } from '@/lib/utils';

type EditorTab = 'prompt' | 'knowledge' | 'config';

const TABS: { key: EditorTab; label: string }[] = [
  { key: 'prompt', label: 'Prompt' },
  { key: 'knowledge', label: 'Base de Conhecimento' },
  { key: 'config', label: 'Configurações Gerais' },
];

export function AgentEditor({ agentId }: { agentId: string }) {
  const orgId = useOrgId();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });
  const agent = useMemo(() => agents?.find((a) => a.id === agentId) ?? null, [agents, agentId]);
  const members = useMemo(
    () => (agents ?? []).filter((a) => a.parentAgentId === agentId),
    [agents, agentId],
  );

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.list(),
  });

  const [tab, setTab] = useState<EditorTab>('prompt');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modelId, setModelId] = useState(DEFAULT_AGENT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [parentAgentId, setParentAgentId] = useState('');
  const [department, setDepartment] = useState('');
  const [squad, setSquad] = useState('');
  const [operationalContext, setOperationalContext] = useState('');
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Chat de teste (testa o prompt ATUAL do editor, mesmo não salvo).
  const [testMsgs, setTestMsgs] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const sendTest = async () => {
    const text = testInput.trim();
    if (!text || testLoading) return;
    const next = [...testMsgs, { role: 'user' as const, content: text }];
    setTestMsgs(next);
    setTestInput('');
    setTestLoading(true);
    try {
      const res = await aiAgentsService.test(agentId, next, systemPrompt);
      setTestMsgs((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao testar o agente');
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setDescription(agent.description ?? '');
    setModelId(agent.modelId);
    setSystemPrompt(agent.systemPrompt);
    setTemperature(agent.temperature);
    setParentAgentId(agent.parentAgentId ?? '');
    setDepartment(agent.department ?? '');
    setSquad(agent.squad ?? '');
    setOperationalContext(agent.operationalContext ?? '');
    setTriggerKeywords(agent.triggerKeywords ?? []);
  }, [agent]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['ai-agents'] });

  const addKeyword = (raw: string) => {
    const parts = raw.split(/[,;\n]/).map((k) => k.trim()).filter(Boolean);
    if (!parts.length) return;
    setTriggerKeywords((prev) => {
      const seen = new Set(prev.map((k) => k.toLowerCase()));
      const next = [...prev];
      for (const p of parts) if (!seen.has(p.toLowerCase())) { next.push(p); seen.add(p.toLowerCase()); }
      return next;
    });
    setKeywordInput('');
  };

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      await aiAgentsService.update(agent.id, {
        name,
        description,
        modelId,
        systemPrompt,
        temperature,
        parentAgentId: parentAgentId || null,
        department: department || null,
        squad: squad.trim() || null,
        operationalContext: operationalContext.trim() || null,
        triggerKeywords,
      });
      toast.success('Agente salvo');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    if (!confirm(`Excluir "${agent.name}"? Essa ação é irreversível.`)) return;
    try {
      await aiAgentsService.remove(agent.id);
      toast.success('Agente excluído');
      refresh();
      router.push('/ai-agents?tab=agents');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir');
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    if (!agent) return;
    try {
      await aiAgentsService.unassignChannel(agent.id, channelId);
      toast.success('Canal removido');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro');
    }
  };

  const promptLen = systemPrompt.length;
  // Contador visual (não bloqueia salvar). Teto folgado — prompts de funil
  // completo (recepção→viabilidade→proposta→contrato) passam de 7000 fácil.
  const promptMax = 20000;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }
  if (!agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Bot className="h-10 w-10 text-zinc-300" />
        <p className="text-sm text-zinc-500">Agente não encontrado.</p>
        <Link href="/ai-agents?tab=agents" className="text-sm text-primary hover:underline">
          ← Voltar para Agentes
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <Link
          href="/ai-agents?tab=agents"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            {(agent.name || '??').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name || agent.name}</p>
            {description && <p className="truncate text-xs text-zinc-500">{description}</p>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            agent.isActive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800',
          )}>
            {agent.isActive ? 'ATIVO' : 'INATIVO'}
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-stretch gap-1 border-b border-zinc-200 px-5 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body: 3 colunas */}
      <div className="flex min-h-0 flex-1">
        {/* Esquerda — grupo multi-agente */}
        <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 p-4 lg:flex dark:border-zinc-800">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Agente inicial</p>
          <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{agent.name}</p>
            <p className="text-[11px] text-zinc-500">{agent.modelId.split('/').pop()}</p>
          </div>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Membros ({members.length})
          </p>
          <div className="mt-2 space-y-1.5">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/ai-agents/${m.id}`}
                className="block rounded-lg border border-zinc-200 p-2.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{m.name}</span>
              </Link>
            ))}
            {members.length === 0 && (
              <p className="text-[11px] text-zinc-400">Sem membros ainda.</p>
            )}
          </div>
          <Link
            href="/ai-agents?tab=agents"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 hover:border-primary hover:text-primary dark:border-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar agente
          </Link>
        </aside>

        {/* Centro — conteúdo da aba */}
        <main className="min-w-0 flex-1 overflow-y-auto p-5">
          {tab === 'prompt' && (
            <div className="flex h-full flex-col">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Escreva o comportamento do agente. Use @variáveis (ex: @nome) e defina o objetivo, tom e regras."
                className="min-h-[420px] flex-1 w-full resize-none rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Dica: use @nome para variáveis e defina o Status inicial.</span>
                <span className={cn('tabular-nums', promptLen > promptMax ? 'font-semibold text-red-500' : 'text-zinc-400')}>
                  {promptLen.toLocaleString('pt-BR')}/{promptMax.toLocaleString('pt-BR')}
                  {promptLen > promptMax && ` (${Math.round((promptLen / promptMax) * 100)}%)`}
                </span>
              </div>

              {/* Contexto operacional do dia */}
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Contexto operacional do dia
                </p>
                <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-200/70">
                  Memória viva injetada no prompt — atualize quando mudar campanha, oferta, prazo.
                </p>
                <textarea
                  value={operationalContext}
                  onChange={(e) => setOperationalContext(e.target.value)}
                  rows={3}
                  maxLength={8000}
                  placeholder="Deixe vazio se hoje não tem nada operacional..."
                  className="mt-2 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-xs dark:border-amber-900/60 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          {tab === 'knowledge' && (
            <div>
              <p className="mb-3 text-sm text-zinc-500">
                Skills e conhecimento que este agente pode usar. (A Base de Conhecimento com documentos
                RAG fica na aba lateral Automações → Base de Conhecimento.)
              </p>
              <AgentSkillsAndTools agentId={agent.id} />
            </div>
          )}

          {tab === 'config' && (
            <div className="max-w-2xl space-y-5">
              <Field label="Nome">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Descrição">
                <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Modelo">
                <select value={modelId} onChange={(e) => setModelId(e.target.value)} className={inputCls}>
                  {CURATED_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label} — {m.badge}</option>
                  ))}
                  {!CURATED_MODELS.some((m) => m.id === modelId) && (
                    <option value={modelId}>{modelId} (custom)</option>
                  )}
                </select>
              </Field>
              <Field label={`Criatividade (${temperature.toFixed(2)})`}>
                <input type="range" min="0" max="1.5" step="0.05" value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Departamento">
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls}>
                    <option value="">— Não definido —</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Squad">
                  <input value={squad} onChange={(e) => setSquad(e.target.value)} placeholder="Ex: Inbound B2C" className={inputCls} />
                </Field>
              </div>
              <Field label="Reporta a (chefe direto)">
                <select value={parentAgentId} onChange={(e) => setParentAgentId(e.target.value)} className={inputCls}>
                  <option value="">— Raiz / sem chefe —</option>
                  {(agents ?? []).filter((a) => a.id !== agent.id).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}{a.kind === 'ORCHESTRATOR' ? ' (Orquestrador)' : ''}</option>
                  ))}
                </select>
              </Field>

              {/* Palavras-chave de acionamento */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  Palavras-chave de acionamento
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-200/70">
                  Se a mensagem contém uma destas, a conversa vai direto pra este agente (antes do classificador).
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {triggerKeywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {kw}
                      <button onClick={() => setTriggerKeywords((p) => p.filter((k) => k !== kw))} className="rounded-full p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => { if (['Enter', ',', ';'].includes(e.key)) { e.preventDefault(); addKeyword(keywordInput); } }}
                    placeholder="Ex: aposentadoria, bpc, loas, auxílio-doença"
                    className="flex-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm dark:border-emerald-900/60 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <button onClick={() => addKeyword(keywordInput)} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                    <Plus className="h-3 w-3" /> Adicionar
                  </button>
                </div>
              </div>

              {/* Canais */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Canais</h4>
                <div className="mt-3 space-y-2">
                  {(agent.channels ?? []).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                      <div className="text-sm">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.channel.name}</span>
                        <span className="ml-2 text-[11px] text-zinc-500">{c.channel.type} · {c.mode.toLowerCase()}</span>
                      </div>
                      <button onClick={() => handleRemoveChannel(c.channelId)} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(agent.channels ?? []).length === 0 && (
                    <p className="text-xs text-zinc-500">Nenhum canal vinculado — o agente não responde ninguém ainda.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <button onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir agente
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Direita — chat de teste */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-zinc-200 lg:flex dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Testar {agent.name}</span>
            </div>
            {testMsgs.length > 0 && (
              <button
                onClick={() => setTestMsgs([])}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                title="Limpar conversa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            {testMsgs.length === 0 && !testLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageSquare className="h-8 w-8 text-zinc-200 dark:text-zinc-700" />
                <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">Inicie uma conversa de teste</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Veja como {agent.name} responderia. Usa o prompt do editor (mesmo sem salvar). Não executa ferramentas nem transfere entre agentes.
                </p>
              </div>
            ) : (
              <>
                {testMsgs.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                      m.role === 'user'
                        ? 'self-end bg-primary text-primary-foreground'
                        : 'self-start bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100',
                    )}
                  >
                    {m.content}
                  </div>
                ))}
                {testLoading && (
                  <div className="self-start rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendTest();
                  }
                }}
                disabled={testLoading}
                placeholder="Escreva uma mensagem de teste..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed"
              />
              <button
                onClick={sendTest}
                disabled={testLoading || !testInput.trim()}
                className="text-zinc-400 hover:text-primary disabled:opacity-40"
                title="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const inputCls =
  'mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
    </div>
  );
}

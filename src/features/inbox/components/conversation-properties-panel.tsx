'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tag as TagIcon, Building2, MapPin, CircleDot, Plus, X, Check, Pencil, Sparkles, Loader2, IdCard } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { inboxService, type Conversation } from '../services/inbox.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente', color: '#f59e0b' },
  { value: 'BOT', label: 'IA / Bot', color: '#3b82f6' },
  { value: 'OPEN', label: 'Em atendimento', color: '#10b981' },
  { value: 'WAITING', label: 'Aguardando', color: '#8b5cf6' },
  { value: 'CLOSED', label: 'Resolvida', color: '#71717a' },
];

function initials(name?: string | null) {
  return (name || '??').slice(0, 2).toUpperCase();
}

/** Formata progressivamente enquanto digita: 000.000.000-00. */
function formatCpf(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function ConversationPropertiesPanel({
  conversation,
  onUpdate,
}: {
  conversation: Conversation;
  onUpdate: () => void;
}) {
  const orgId = useOrgId();
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(conversation.contact?.name ?? '');
  const [origemValue, setOrigemValue] = useState<string>(
    (conversation.contact?.metadata?.origem as string) ?? '',
  );
  const [cpfValue, setCpfValue] = useState<string>(
    formatCpf(conversation.contact?.cpf ?? ''),
  );

  // Sincroniza o CPF quando o contato completo chega (a lista não traz cpf; o
  // getConversation traz). Não atropela edição em andamento.
  useEffect(() => {
    const cpf = formatCpf(conversation.contact?.cpf ?? '');
    setCpfValue((prev) => (prev === '' ? cpf : prev));
  }, [conversation.contact?.cpf]);

  // Sincroniza origem quando o metadata do contato chega (a conversa da lista
  // não traz metadata; o refetch do getConversation traz). Só preenche se o
  // campo ainda estiver vazio, pra não atropelar edição em andamento.
  useEffect(() => {
    const o = (conversation.contact?.metadata?.origem as string) ?? '';
    setOrigemValue((prev) => (prev === '' ? o : prev));
  }, [conversation.contact?.metadata?.origem]);

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags', orgId],
    queryFn: () => tagsService.list(),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', orgId],
    queryFn: () => inboxService.listDepartments(),
  });

  const assignedTags = useMemo(
    () => (conversation.tags ?? []).map((t: any) => t.tag ?? t).filter(Boolean),
    [conversation.tags],
  );
  const assignedTagIds = new Set(assignedTags.map((t: any) => t.id));

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === conversation.status);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      onUpdate();
      toast.success(okMsg);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (value: string) =>
    run(() => inboxService.updateConversation(conversation.id, { status: value }), 'Status atualizado');
  const setDepartment = (value: string) =>
    run(
      () => inboxService.updateConversation(conversation.id, { departmentId: value || null }),
      'Departamento atualizado',
    );
  const toggleTag = (tagId: string, isOn: boolean) =>
    run(
      () => (isOn ? inboxService.removeTag(conversation.id, tagId) : inboxService.addTag(conversation.id, tagId)),
      isOn ? 'Etiqueta removida' : 'Etiqueta adicionada',
    );

  const c = conversation.contact;

  const saveName = () => {
    setEditingName(false);
    const v = nameValue.trim();
    if (!v || v === (c?.name ?? '')) return;
    run(() => inboxService.updateContact(c.id, { name: v }), 'Nome atualizado');
  };
  const saveOrigem = () => {
    const v = origemValue.trim();
    if (v === ((c?.metadata?.origem as string) ?? '')) return;
    run(() => inboxService.updateContact(c.id, { metadata: { origem: v } }), 'Origem atualizada');
  };
  const saveCpf = () => {
    const digits = cpfValue.replace(/\D/g, '');
    if (digits === (c?.cpf ?? '')) return; // sem mudança
    if (digits !== '' && digits.length !== 11) {
      toast.error('CPF precisa ter 11 dígitos.');
      return;
    }
    run(
      () => inboxService.updateContact(c.id, { cpf: digits }),
      digits ? 'CPF salvo' : 'CPF removido',
    );
  };

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const generateSummary = async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryText('');
    setSummaryError('');
    try {
      const res = await inboxService.summarizeConversation(conversation.id);
      setSummaryText(res.summary);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message;
      setSummaryError(
        typeof msg === 'string' && msg
          ? msg
          : 'Não foi possível gerar o resumo agora.',
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 xl:flex">
      {/* Cabeçalho do contato */}
      <div className="flex flex-col items-center border-b border-zinc-100 px-4 py-5 dark:border-zinc-800">
        {c?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatarUrl} alt={c.name ?? ''} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
            {initials(c?.name)}
          </div>
        )}
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') { setEditingName(false); setNameValue(c?.name ?? ''); }
            }}
            className="mt-3 w-full rounded-md border border-primary/40 bg-white px-2 py-1 text-center text-sm font-semibold text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setNameValue(c?.name ?? ''); setEditingName(true); }}
            title="Editar nome"
            className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-900 hover:text-primary dark:text-zinc-100"
          >
            {c?.name || 'Sem nome'}
            <Pencil className="h-3 w-3 text-zinc-300 group-hover:text-primary" />
          </button>
        )}
        {c?.phone && <p className="text-xs text-zinc-500">{c.phone}</p>}
      </div>

      {/* Resumo inteligente (IA) */}
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <button
          onClick={generateSummary}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Sparkles className="h-4 w-4" />
          Resumo inteligente
        </button>
      </div>

      {/* Atendimento */}
      <Section title="Atendimento">
        <Row icon={<CircleDot className="h-4 w-4" />} label="Responsável">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {conversation.assignedTo?.name ?? (
              <span className="text-zinc-400">Não atribuído</span>
            )}
          </span>
        </Row>
      </Section>

      {/* Propriedades */}
      <Section title="Propriedades">
        {/* CPF — chave que casa o contato com o cliente no Tramitação */}
        <Row icon={<IdCard className="h-4 w-4" />} label="CPF">
          <input
            value={cpfValue}
            onChange={(e) => setCpfValue(formatCpf(e.target.value))}
            onBlur={saveCpf}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="w-full rounded-md border border-transparent bg-transparent py-1 text-sm text-zinc-700 outline-none placeholder:text-zinc-400 hover:bg-zinc-50 focus:border-primary/40 dark:text-zinc-200 dark:hover:bg-zinc-900"
          />
        </Row>

        {/* Status */}
        <Row icon={<span className="h-3 w-3 rounded-full" style={{ backgroundColor: currentStatus?.color ?? '#a1a1aa' }} />} label="Status">
          <select
            disabled={busy}
            value={conversation.status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full cursor-pointer rounded-md border border-transparent bg-transparent py-1 text-sm text-zinc-700 outline-none hover:bg-zinc-50 focus:border-primary/40 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {!currentStatus && <option value={conversation.status}>Selecionar status</option>}
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Row>

        {/* Etiquetas */}
        <div className="px-4 py-2.5">
          <div className="flex items-center gap-2 text-zinc-400">
            <TagIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Etiquetas</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {assignedTags.map((t: any) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: `${t.color}1f`, color: t.color }}
              >
                {t.name}
                <button onClick={() => toggleTag(t.id, true)} disabled={busy} className="rounded-full p-0.5 hover:bg-black/5">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <Popover className="relative">
              <PopoverButton className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-500 hover:border-primary hover:text-primary dark:border-zinc-700">
                <Plus className="h-3 w-3" /> Adicionar
              </PopoverButton>
              <PopoverPanel
                anchor="bottom end"
                className="z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
              >
                {allTags.length === 0 && (
                  <p className="px-2 py-2 text-center text-[11px] text-zinc-400">Nenhuma etiqueta. Crie em Configurações → Tags.</p>
                )}
                {allTags.map((t) => {
                  const on = assignedTagIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id, on)}
                      disabled={busy}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="flex-1 truncate text-zinc-700 dark:text-zinc-200">{t.name}</span>
                      {on && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </PopoverPanel>
            </Popover>
          </div>
        </div>

        {/* Departamento */}
        <Row icon={<Building2 className="h-4 w-4" />} label="Departamento">
          <select
            disabled={busy}
            value={conversation.departmentId ?? ''}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full cursor-pointer rounded-md border border-transparent bg-transparent py-1 text-sm text-zinc-700 outline-none hover:bg-zinc-50 focus:border-primary/40 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <option value="">Selecionar departamento</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Row>

        {/* Origem (canal) */}
        <Row icon={<MapPin className="h-4 w-4" />} label="Origem">
          <input
            value={origemValue}
            onChange={(e) => setOrigemValue(e.target.value)}
            onBlur={saveOrigem}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            placeholder="Selecionar origem"
            className="w-full rounded-md border border-transparent bg-transparent py-1 text-sm text-zinc-700 outline-none placeholder:text-zinc-400 hover:bg-zinc-50 focus:border-primary/40 dark:text-zinc-200 dark:hover:bg-zinc-900"
          />
        </Row>
      </Section>

      {summaryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSummaryOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Sparkles className="h-4 w-4 text-primary" /> Resumo inteligente
              </h3>
              <button onClick={() => setSummaryOpen(false)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {summaryLoading ? (
                <div className="flex flex-col items-center gap-3 py-8 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm">Gerando resumo com IA…</p>
                </div>
              ) : summaryError ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">{summaryError}</p>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{summaryText}</p>
              )}
            </div>
            {!summaryLoading && (
              <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
                {summaryText && (
                  <button
                    onClick={() => { navigator.clipboard?.writeText(summaryText); toast.success('Resumo copiado'); }}
                    className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Copiar
                  </button>
                )}
                <button onClick={generateSummary} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Gerar novamente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 py-2 dark:border-zinc-800">
      <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      {children}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="flex w-5 shrink-0 justify-center text-zinc-400">{icon}</span>
      <span className="w-24 shrink-0 text-xs text-zinc-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

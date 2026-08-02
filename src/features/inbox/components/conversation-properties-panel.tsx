'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tag as TagIcon, Building2, MapPin, CircleDot, Plus, X, Check } from 'lucide-react';
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

export function ConversationPropertiesPanel({
  conversation,
  onUpdate,
}: {
  conversation: Conversation;
  onUpdate: () => void;
}) {
  const orgId = useOrgId();
  const [busy, setBusy] = useState(false);

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
      () => inboxService.updateConversation(conversation.id, { department: value || null }),
      'Departamento atualizado',
    );
  const toggleTag = (tagId: string, isOn: boolean) =>
    run(
      () => (isOn ? inboxService.removeTag(conversation.id, tagId) : inboxService.addTag(conversation.id, tagId)),
      isOn ? 'Etiqueta removida' : 'Etiqueta adicionada',
    );

  const c = conversation.contact;

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
        <p className="mt-3 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {c?.name || 'Sem nome'}
        </p>
        {c?.phone && <p className="text-xs text-zinc-500">{c.phone}</p>}
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
            value={conversation.department ?? ''}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full cursor-pointer rounded-md border border-transparent bg-transparent py-1 text-sm text-zinc-700 outline-none hover:bg-zinc-50 focus:border-primary/40 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <option value="">Selecionar departamento</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </Row>

        {/* Origem (canal) */}
        <Row icon={<MapPin className="h-4 w-4" />} label="Origem">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {conversation.channel?.name ?? <span className="text-zinc-400">—</span>}
          </span>
        </Row>
      </Section>
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

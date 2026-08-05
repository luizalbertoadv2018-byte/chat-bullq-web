'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { CalendarClock, Trash2, Clock, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  scheduledMessagesService,
  type ScheduledMessage,
} from '@/features/scheduled-messages/services/scheduled-messages.service';
import { useOrgId } from '@/hooks/use-org-query-key';

function previewOf(m: ScheduledMessage): string {
  if (m.type === 'TEXT') return m.content?.text || '(sem texto)';
  return `[${m.type.toLowerCase()}]`;
}

function formatWhen(iso: string): { label: string; relative: string } {
  const d = new Date(iso);
  const label = d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const diffMs = d.getTime() - Date.now();
  const mins = Math.round(diffMs / 60000);
  let relative: string;
  if (mins < 1) relative = 'em instantes';
  else if (mins < 60) relative = `em ${mins} min`;
  else if (mins < 60 * 24) relative = `em ${Math.round(mins / 60)}h`;
  else relative = `em ${Math.round(mins / (60 * 24))} dias`;
  return { label, relative };
}

export default function SchedulesPage() {
  const orgId = useOrgId();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['scheduled-messages', orgId],
    queryFn: () => scheduledMessagesService.list(),
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => scheduledMessagesService.cancel(id),
    onSuccess: () => {
      toast.success('Agendamento cancelado');
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Erro ao cancelar'),
  });

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Agendamentos
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Mensagens programadas para envio automático. Cancele antes da hora
            se precisar.
          </p>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-zinc-400">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-zinc-200 p-16 text-center dark:border-zinc-800">
            <Clock className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Nenhuma mensagem agendada
            </p>
            <p className="mt-1 max-w-md text-xs text-zinc-400">
              Na conversa, escreva a mensagem e clique no relógio ao lado de
              enviar para agendar o envio para uma data e hora futura.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((m) => {
              const when = formatWhen(m.sendAt);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[13px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {m.contactAvatar ? (
                      <img
                        src={m.contactAvatar}
                        alt={m.contactName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      (m.contactName || '?').slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {m.contactName}
                      </p>
                      {m.channelName && (
                        <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {m.channelName}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-zinc-500">
                      {previewOf(m)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                      <Clock className="h-3 w-3" />
                      {when.label} · {when.relative}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/inbox?c=${m.conversationId}`)}
                    title="Abrir conversa"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate(m.id)}
                    disabled={cancelMutation.isPending}
                    title="Cancelar agendamento"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

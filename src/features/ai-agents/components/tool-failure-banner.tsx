'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { notificationsSettingsService } from '@/features/settings/services/notifications.service';

// Nome técnico da ferramenta → o que ela faz, em português de escritório.
const TOOL_LABELS: Record<string, string> = {
  checklistDocumentos: 'marcar um documento como recebido',
  enviarDocumentoAssinatura: 'enviar ou consultar a ficha no ZapSign',
  registrarDadoDoCaso: 'registrar um dado do caso',
  moverNoFunil: 'mover o card no kanban',
  enviarMensagemPronta: 'enviar uma mensagem pronta',
  transferToHuman: 'transferir para um atendente',
};

/**
 * Persistent banner shown app-wide whenever there are unread
 * AI_TOOL_FAILURE notifications. Polls every 30s. The point is to make
 * silent IA failures impossible to miss — without this, the Lívia 404
 * case (run completes "successfully" while the skill output is broken)
 * stays invisible until a customer complains.
 *
 * O texto diz o que a IA tentou fazer e o botão leva direto à conversa em
 * que falhou; a lista geral de execuções não ajudava a entender o aviso.
 */
export function ToolFailureBanner() {
  const queryClient = useQueryClient();

  const { data: notif } = useQuery({
    queryKey: ['notifications', 'tool-failures'],
    queryFn: async () => {
      const r = await notificationsSettingsService.list(1, 50);
      return r.notifications.filter(
        (n) => n.type === 'AI_TOOL_FAILURE' && !n.isRead,
      );
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = (notif ?? []).map((n) => n.id);
      // Don't blast `markAllRead` — that would dismiss unrelated notifs
      // (new message, mention, etc) the user actually wants to see.
      await Promise.all(
        ids.map((id) => notificationsSettingsService.markRead(id)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const count = notif?.length ?? 0;
  const last = notif?.[0];

  const { headline, detail, conversationId } = useMemo(() => {
    if (!last) return { headline: null, detail: null, conversationId: null };
    const toolName = String(last.data?.toolName ?? '');
    const what =
      TOOL_LABELS[toolName] ?? `usar a ferramenta ${toolName || 'da IA'}`;
    const reason = String(
      last.data?.output?.error ?? last.data?.errorMessage ?? '',
    ).trim();
    return {
      headline:
        count === 1
          ? `A IA não conseguiu ${what}`
          : `A IA teve ${count} falhas. A última: não conseguiu ${what}`,
      detail: reason || null,
      conversationId: (last.data?.conversationId as string) ?? null,
    };
  }, [count, last]);

  if (count === 0) return null;

  return (
    <div className="border-b border-red-200 bg-red-50 px-6 py-2.5 dark:border-red-900/40 dark:bg-red-900/20">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
        <div className="min-w-0 flex-1 truncate text-sm text-red-800 dark:text-red-200">
          <span className="font-medium">{headline}</span>
          {detail && (
            <span className="ml-2 text-red-700 dark:text-red-300" title={detail}>
              · Motivo: {detail}
            </span>
          )}
        </div>
        {conversationId && (
          <Link
            href={`/inbox?conversationId=${conversationId}`}
            className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Abrir a conversa
          </Link>
        )}
        <Link
          href="/ai-agents?tab=runs"
          className="shrink-0 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          Histórico da IA
        </Link>
        <button
          type="button"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending}
          className="shrink-0 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          {markAll.isPending ? 'Dispensando…' : 'Já vi, dispensar'}
        </button>
        <button
          type="button"
          onClick={() => markAll.mutate()}
          className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-400"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { FileSignature, Bot, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  inboxService,
  type Conversation,
} from '../services/inbox.service';
import { aiAgentsService } from '@/features/ai-agents/services/ai-agents.service';

interface Props {
  conversation: Conversation;
  onChanged?: () => void;
}

/**
 * Botão "Gerar contrato": o advogado atendeu na mão e passa só o fechamento.
 * Escolhe o modelo da ZapSign e o agente; o agente vai direto às perguntas
 * do contrato, sem refazer a triagem.
 */
export function ContractPopover({ conversation, onChanged }: Props) {
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ['contract-templates', conversation.id],
    queryFn: () => inboxService.listContractTemplates(conversation.id),
    enabled: open,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => aiAgentsService.list(),
    staleTime: 60_000,
    enabled: open,
  });
  const activeAgents = useMemo(
    () => agents.filter((a) => a.isActive),
    [agents],
  );

  const handleStart = async (closeFn: () => void) => {
    if (!templateId || !agentId) return;
    setBusy(true);
    try {
      const result = await inboxService.startContract(
        conversation.id,
        agentId,
        templateId,
      );
      if (result.engaged) {
        toast.success(
          `${result.agentName ?? 'Agente'} assumiu o fechamento do contrato`,
        );
      } else {
        toast.info(
          `Fechamento marcado, mas o agente não engajou (${result.reason})`,
        );
      }
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      onChanged?.();
      setTemplateId(null);
      setAgentId(null);
      closeFn();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Erro ao iniciar o fechamento',
      );
    } finally {
      setBusy(false);
    }
  };

  const templatesError = templatesQuery.error as any;

  return (
    <Popover className="relative">
      <PopoverButton
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
        title="Passar o fechamento do contrato para um agente"
      >
        <FileSignature className="h-3.5 w-3.5" />
        <span>Gerar contrato</span>
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-80 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
      >
        {({ close }) => (
          <>
            <div className="px-2 py-1.5">
              <p className="text-[11px] text-zinc-500">
                O agente vai direto às perguntas do contrato, sem refazer a
                triagem, e envia o link de assinatura.
              </p>
            </div>

            <p className="px-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              1. Modelo do contrato
            </p>
            <div className="max-h-40 overflow-y-auto">
              {templatesQuery.isLoading && (
                <p className="flex items-center justify-center gap-1.5 px-2 py-3 text-[11px] text-zinc-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando
                  modelos…
                </p>
              )}
              {templatesError && (
                <p className="px-2 py-3 text-center text-[11px] text-red-500">
                  {templatesError?.response?.data?.message ||
                    'Erro ao carregar os modelos da ZapSign'}
                </p>
              )}
              {templatesQuery.data?.length === 0 && (
                <p className="px-2 py-3 text-center text-[11px] text-zinc-400">
                  Nenhum modelo na conta ZapSign
                </p>
              )}
              {templatesQuery.data?.map((t) => {
                const selected = t.token === templateId;
                return (
                  <button
                    key={t.token}
                    onClick={() => setTemplateId(t.token)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      selected
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <FileSignature className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="min-w-0 flex-1 truncate text-zinc-900 dark:text-zinc-100">
                      {t.name}
                    </span>
                    {selected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="px-2 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              2. Agente que fecha
            </p>
            <div className="max-h-40 overflow-y-auto">
              {activeAgents.length === 0 && (
                <p className="px-2 py-3 text-center text-[11px] text-zinc-400">
                  Nenhum agente ativo
                </p>
              )}
              {activeAgents.map((a) => {
                const selected = a.id === agentId;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAgentId(a.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      selected
                        ? 'bg-violet-50 dark:bg-violet-900/20'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <Bot className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {a.name}
                      </p>
                      {a.description && (
                        <p className="truncate text-[10px] text-zinc-500">
                          {a.description}
                        </p>
                      )}
                    </div>
                    {selected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-1.5 pt-2">
              <button
                onClick={() => handleStart(close)}
                disabled={!templateId || !agentId || busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Iniciar fechamento
              </button>
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
}

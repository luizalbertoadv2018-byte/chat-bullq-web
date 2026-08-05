'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  Loader2,
  X,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  channelsService,
  type EvolutionConnectResult,
} from '../services/channels.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

type Step = 'form' | 'qr' | 'done';

export function EvolutionConnectDialog({ open, onClose, onConnected }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '', instance: '' });
  const [channelId, setChannelId] = useState<string | null>(null);
  const [qr, setQr] = useState<EvolutionConnectResult | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Reset ao fechar.
  useEffect(() => {
    if (!open) {
      setStep('form');
      setForm({ name: '', baseUrl: '', apiKey: '', instance: '' });
      setChannelId(null);
      setQr(null);
      setBusy(false);
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [open]);

  // Poll do status enquanto o QR está na tela.
  useEffect(() => {
    if (step !== 'qr' || !channelId) return;
    pollRef.current = setInterval(async () => {
      try {
        const { state } = await channelsService.evolutionStatus(channelId);
        if (state === 'open' || state === 'connected') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('done');
          onConnected?.();
        }
      } catch {
        /* ignora — segue tentando */
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, channelId, onConnected]);

  const createAndConnect = async () => {
    const baseUrl = form.baseUrl.trim().replace(/\/$/, '');
    const apiKey = form.apiKey.trim();
    const instance = form.instance.trim();
    if (!form.name.trim() || !baseUrl || !apiKey || !instance) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setBusy(true);
    try {
      const channel = await channelsService.create({
        type: 'WHATSAPP_EVOLUTION',
        name: form.name.trim(),
        config: { baseUrl, apiKey, instance },
      });
      setChannelId(channel.id);
      const res = await channelsService.connectEvolution(channel.id);
      setQr(res);
      setStep('qr');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar/conectar o canal.');
    } finally {
      setBusy(false);
    }
  };

  const refreshQr = async () => {
    if (!channelId) return;
    setBusy(true);
    try {
      const res = await channelsService.connectEvolution(channelId);
      setQr(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao gerar novo QR.');
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof form,
    placeholder: string,
    type = 'text',
  ) => (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-[13px] text-zinc-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900">
          <div className="mb-3 flex items-start justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                <Smartphone className="h-4 w-4" />
              </span>
              WhatsApp via Evolution API
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {step === 'form' && (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] text-zinc-500">
                Informe os dados da sua instância Evolution (self-hosted). A URL
                e a API key ficam guardadas só no canal.
              </p>
              {field('Nome do canal', 'name', 'Ex.: WhatsApp Atendimento')}
              {field('URL da instância', 'baseUrl', 'https://evo.seuservidor.com')}
              {field('API key', 'apiKey', 'sua-api-key', 'password')}
              {field('Nome da instância', 'instance', 'ex.: atendimento')}
              <button
                onClick={createAndConnect}
                disabled={busy}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
                Criar e gerar QR Code
              </button>
            </div>
          )}

          {step === 'qr' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-[13px] text-zinc-600 dark:text-zinc-300">
                Abra o WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um
                aparelho</b> e escaneie:
              </p>
              {qr?.qrBase64 ? (
                <img
                  src={qr.qrBase64}
                  alt="QR Code"
                  className="h-56 w-56 rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700">
                  {qr?.pairingCode ? (
                    <div>
                      <p className="text-xs">Código de pareamento:</p>
                      <p className="mt-1 text-lg font-bold tracking-widest">
                        {qr.pairingCode}
                      </p>
                    </div>
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  )}
                </div>
              )}
              <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aguardando leitura…
              </p>
              <button
                onClick={refreshQr}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                Gerar novo QR
              </button>
              {qr?.webhookUrl && (
                <p className="mt-1 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  ⚠️ Sua instância Evolution precisa alcançar publicamente:
                  <br />
                  <code className="break-all">{qr.webhookUrl}</code>
                  <br />
                  (localhost não recebe webhook — use túnel/deploy)
                </p>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                WhatsApp conectado!
              </p>
              <p className="text-[12px] text-zinc-500">
                O canal já aparece na lista de conexões e começa a receber
                mensagens.
              </p>
              <button
                onClick={onClose}
                className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Concluir
              </button>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { Blocks, Search, Plus, Calendar, HardDrive, ListTodo, Workflow, FileSignature } from 'lucide-react';

// Integrações disponíveis para os agentes (mapeadas às tools do Chat BullQ).
// Layout no estilo LiderHub (tabela NOME / DESCRIÇÃO / STATUS).
const INTEGRATIONS = [
  { name: 'Google Calendar', desc: 'Consultar e agendar eventos (perícias, audiências) de forma automatizada pelos agentes.', icon: Calendar, connected: true },
  { name: 'Google Drive', desc: 'Ler e anexar documentos do cliente direto do Drive.', icon: HardDrive, connected: false },
  { name: 'ClickUp', desc: 'Criar e acompanhar tarefas do escritório a partir do atendimento.', icon: ListTodo, connected: false },
  { name: 'n8n', desc: 'Disparar automações e webhooks externos.', icon: Workflow, connected: false },
  { name: 'ZapSign', desc: 'Enviar procurações e contratos de honorários para assinatura digital direto pelo agente.', icon: FileSignature, connected: true },
];

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const list = INTEGRATIONS.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.desc.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Integrações</h1>
          <p className="mt-1 text-sm text-zinc-500">Gerencie as integrações disponíveis para seus agentes.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar integrações por nome ou descrição..."
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.name} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                      <i.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{i.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500">{i.desc}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    i.connected
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${i.connected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    {i.connected ? 'Conectado' : 'Disponível'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-xs text-zinc-400">
        {list.length} integração{list.length === 1 ? '' : 'ões'}
      </p>
    </div>
  );
}

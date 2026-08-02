'use client';

import { useState } from 'react';
import { AudioLines, Search, Plus, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

// Vozes de IA (TTS) no estilo LiderHub. As vozes públicas são exemplos das
// vozes disponíveis; a síntese conecta ao provedor de TTS quando configurado.
const PUBLIC_VOICES = [
  { name: 'Anna', desc: 'Feminina, tom acolhedor — ideal para recepção.', color: 'from-sky-400 to-blue-500' },
  { name: 'Caio', desc: 'Masculina, tom firme e claro.', color: 'from-amber-400 to-yellow-500' },
  { name: 'Gabriel', desc: 'Masculina, tom jovem e ágil.', color: 'from-rose-400 to-red-500' },
  { name: 'Camila', desc: 'Feminina, tom neutro e profissional.', color: 'from-violet-400 to-indigo-500' },
  { name: 'Maria', desc: 'Feminina, tom maternal — bom para benefícios sensíveis.', color: 'from-fuchsia-400 to-pink-500' },
];

export default function VoicesPage() {
  const [tab, setTab] = useState<'public' | 'mine'>('public');
  const [search, setSearch] = useState('');
  const list = PUBLIC_VOICES.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Vozes</h1>
          <p className="mt-1 text-sm text-zinc-500">Gerencie as vozes de IA da sua organização.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nova Voz
        </button>
      </div>

      <div className="mt-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {([['public', 'Vozes Públicas'], ['mine', 'Minhas Vozes']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar vozes por nome ou descrição..."
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="mt-4">
        {tab === 'mine' ? (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-zinc-200 p-16 text-center dark:border-zinc-800">
            <Mic className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">Nenhuma voz personalizada ainda</p>
            <p className="mt-1 text-xs text-zinc-400">Crie uma voz própria para os áudios dos seus agentes.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <div key={v.name} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-white', v.color)}>
                  <AudioLines className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{v.name}</p>
                  <p className="truncate text-xs text-zinc-500">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

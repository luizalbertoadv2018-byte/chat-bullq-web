'use client';

import { useState } from 'react';
import { BookOpen, Search, Plus, FileText } from 'lucide-react';

// Base de Conhecimento (RAG) no estilo LiderHub. A listagem de documentos
// conecta ao subsistema RAG do backend quando o endpoint estiver disponível.
export default function KnowledgePage() {
  const [search, setSearch] = useState('');

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Base de Conhecimento</h1>
          <p className="mt-1 text-sm text-zinc-500">Centralize e gerencie todo o conhecimento da sua organização.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Adicionar Documento
        </button>
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, conteúdo ou ID..."
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Agentes</th>
              <th className="px-4 py-3 text-right">Atualização</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="px-4 py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-zinc-200 dark:text-zinc-700" />
                <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Nenhum documento na base ainda
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-zinc-400">
                  Adicione arquivos (PDF) ou textos para os agentes usarem como referência
                  (ex.: guias de benefício, FAQ, modelos de proposta). Os documentos alimentam
                  a IA via RAG.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

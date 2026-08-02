'use client';

import Link from 'next/link';
import { Search, Bell } from 'lucide-react';

/**
 * Barra superior global (estilo LiderHub) — só no desktop. Busca (⌘K, stub por
 * enquanto) + notificações à direita. Fica acima do conteúdo; o conteúdo segue
 * ocupando o espaço restante (flex-1), então não quebra o inbox h-full.
 */
export function TopBar() {
  return (
    <div className="hidden h-12 shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
      <div className="flex-1" />

      <button
        type="button"
        // Busca global ainda é um stub visual — abre no futuro um command palette.
        className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
      >
        <Search className="h-4 w-4" />
        <span className="w-40 text-left">Buscar...</span>
        <kbd className="rounded border border-zinc-200 bg-white px-1 text-[10px] font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
          ⌘K
        </kbd>
      </button>

      <Link
        href="/settings/notifications"
        aria-label="Notificações"
        title="Notificações"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <Bell className="h-5 w-5" />
      </Link>
    </div>
  );
}

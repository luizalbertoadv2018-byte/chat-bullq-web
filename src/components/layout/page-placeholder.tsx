'use client';

import { type ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface PagePlaceholderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  note?: string;
}

/**
 * Cabeçalho + estado "em construção" padronizado, no visual LiderHub.
 * Usado nas rotas novas enquanto a feature real não é implementada.
 */
export function PagePlaceholder({
  title,
  subtitle,
  icon,
  note = 'Esta seção está sendo preparada. Em breve, disponível por aqui.',
}: PagePlaceholderProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </header>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon ?? <Construction className="size-6" />}
          </div>
          <p className="text-sm font-medium text-foreground">Em construção</p>
          <p className="text-sm text-muted-foreground">{note}</p>
        </div>
      </div>
    </div>
  );
}

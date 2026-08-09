'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { situacoesService, type Situacao } from '@/features/settings/services/situacoes.service';
import { useOrgId } from '@/hooks/use-org-query-key';

const PRESET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#6b7280'];

const SUGGESTIONS = [
  'Contrato Assinado',
  'Assinatura Pendente',
  'Recepção',
  'Análise',
  'Qualificado',
  'Desqualificado',
];

export default function SettingsSituacoesPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const orgId = useOrgId();
  const { data: situacoes, isLoading } = useQuery({
    queryKey: ['situacoes', orgId],
    queryFn: () => situacoesService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['situacoes'] });

  const handleCreate = async (name: string, color: string) => {
    if (!name.trim()) return;
    try {
      await situacoesService.create({ name: name.trim(), color });
      setNewName('');
      toast.success('Situação criada');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar situação');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await situacoesService.update(id, { name: editName, color: editColor });
      setEditingId(null);
      toast.success('Situação atualizada');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta situação? As conversas que a usam ficam sem situação.')) return;
    try {
      await situacoesService.remove(id);
      toast.success('Situação removida');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao remover');
    }
  };

  const startEdit = (s: Situacao) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditColor(s.color);
  };

  const existingNames = new Set((situacoes ?? []).map((s) => s.name.toLowerCase()));
  const remainingSuggestions = SUGGESTIONS.filter((s) => !existingNames.has(s.toLowerCase()));

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Situações</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Marque cada conversa com a etapa do seu funil (Contrato Assinado, Qualificado, ...). É um rótulo seu — não muda o atendimento nem a IA.
        </p>
      </div>

      <div className="mt-6 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Nome da situação</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate(newName, newColor)}
            placeholder="Ex: Qualificado, Contrato Assinado..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Cor</label>
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`h-8 w-8 rounded-md transition-transform ${newColor === c ? 'scale-110 ring-2 ring-offset-1 ring-zinc-400' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => handleCreate(newName, newColor)}
          disabled={!newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Criar
        </button>
      </div>

      {remainingSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-400">Sugestões:</span>
          {remainingSuggestions.map((s, i) => (
            <button
              key={s}
              onClick={() => handleCreate(s, PRESET_COLORS[i % PRESET_COLORS.length])}
              className="rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-500 hover:border-primary hover:text-primary dark:border-zinc-700"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
          ))
        ) : !situacoes?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Flag className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">Nenhuma situação criada — use as sugestões acima pra começar.</p>
          </div>
        ) : (
          situacoes.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              {editingId === s.id ? (
                <div className="flex flex-1 items-center gap-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`h-6 w-6 rounded ${editColor === c ? 'ring-2 ring-offset-1 ring-zinc-400' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button onClick={() => handleUpdate(s.id)} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Salvar</button>
                  <button onClick={() => setEditingId(null)} className="rounded px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{s.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(s)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

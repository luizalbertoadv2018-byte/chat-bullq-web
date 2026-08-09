'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { documentosService, type DocumentoBeneficio } from '@/features/settings/services/documentos.service';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { useOrgId } from '@/hooks/use-org-query-key';

export default function SettingsDocumentosPage() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const [pipelineId, setPipelineId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines', orgId],
    queryFn: () => pipelinesService.list(),
  });

  // Seleciona o primeiro pipeline por padrão.
  useEffect(() => {
    if (!pipelineId && pipelines.length > 0) setPipelineId(pipelines[0].id);
  }, [pipelines, pipelineId]);

  const { data: docs, isLoading } = useQuery({
    queryKey: ['documentos', orgId, pipelineId],
    queryFn: () => documentosService.listByPipeline(pipelineId),
    enabled: !!pipelineId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['documentos'] });

  const handleCreate = async (name: string) => {
    if (!name.trim() || !pipelineId) return;
    try {
      await documentosService.create({ pipelineId, name: name.trim() });
      setNewName('');
      toast.success('Documento adicionado');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao adicionar');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await documentosService.update(id, { name: editName });
      setEditingId(null);
      toast.success('Documento atualizado');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este documento da lista?')) return;
    try {
      await documentosService.remove(id);
      toast.success('Documento removido');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao remover');
    }
  };

  const startEdit = (d: DocumentoBeneficio) => {
    setEditingId(d.id);
    setEditName(d.name);
  };

  const existing = new Set((docs ?? []).map((d) => d.name.toLowerCase()));
  const sugestoes = getSugestoes(pipelines.find((p) => p.id === pipelineId)?.name ?? '')
    .filter((s) => !existing.has(s.toLowerCase()));

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Documentos por benefício</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Liste os documentos que cada benefício exige. A IA usa pra cobrar o que falta do cliente antes de protocolar.
        </p>
      </div>

      {/* Seletor de benefício */}
      <div className="mt-6">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Benefício (pipeline)</label>
        <select
          value={pipelineId}
          onChange={(e) => setPipelineId(e.target.value)}
          className="w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {pipelines.length === 0 && <option value="">Nenhum pipeline</option>}
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Adicionar documento */}
      <div className="mt-4 flex items-end gap-3">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Documento</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate(newName)}
            placeholder="Ex: CNIS, RG, Laudo médico..."
            disabled={!pipelineId}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <button
          onClick={() => handleCreate(newName)}
          disabled={!newName.trim() || !pipelineId}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {sugestoes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-400">Sugestões:</span>
          {sugestoes.map((s) => (
            <button
              key={s}
              onClick={() => handleCreate(s)}
              className="rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-500 hover:border-primary hover:text-primary dark:border-zinc-700"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="mt-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
          ))
        ) : !docs?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FileText className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">Nenhum documento neste benefício — use as sugestões acima.</p>
          </div>
        ) : (
          docs.map((d, idx) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
              {editingId === d.id ? (
                <div className="flex flex-1 items-center gap-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <button onClick={() => handleUpdate(d.id)} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Salvar</button>
                  <button onClick={() => setEditingId(null)} className="rounded px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800">{idx + 1}</span>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{d.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(d)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
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

/** Sugestões de documentos por tipo de benefício (casa pelo nome do pipeline). */
function getSugestoes(pipelineName: string): string[] {
  const n = pipelineName.toLowerCase();
  const base = ['RG e CPF', 'Comprovante de residência', 'CNIS'];
  if (n.includes('acidente')) return [...base, 'Laudos e atestados médicos', 'CAT (Comunicação de Acidente)', 'Exames', 'Carteira de trabalho'];
  if (n.includes('doen') || n.includes('invalid')) return [...base, 'Laudos e atestados médicos', 'Exames', 'Receitas médicas', 'Carteira de trabalho'];
  if (n.includes('bpc') || n.includes('loas')) return [...base, 'Laudo médico (se PCD)', 'CadÚnico', 'Comprovante de renda familiar'];
  if (n.includes('matern')) return [...base, 'Certidão de nascimento / DN', 'Carteira de trabalho'];
  return [...base, 'Documentos médicos', 'Carteira de trabalho'];
}

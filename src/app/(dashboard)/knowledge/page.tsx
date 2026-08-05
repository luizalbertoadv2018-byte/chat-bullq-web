'use client';

import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, FileText, Trash2, Pencil, Loader2, X, Upload, Type, CheckCircle2, AlertCircle, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { knowledgeService, type KnowledgeDocument } from '@/features/knowledge/services/knowledge.service';
import { aiAgentsService } from '@/features/ai-agents/services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';

type Mode = 'text' | 'pdf';

interface FormState {
  id: string | null;
  title: string;
  content: string;
  agentIds: string[];
  mode: Mode;
  file: File | null;
}

const EMPTY: FormState = { id: null, title: '', content: '', agentIds: [], mode: 'text', file: null };

function StatusBadge({ doc }: { doc: KnowledgeDocument }) {
  if (doc.status === 'READY')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" /> {doc.chunkCount} trechos
      </span>
    );
  if (doc.status === 'INDEXING')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Loader2 className="h-3 w-3 animate-spin" /> indexando…
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400" title={doc.error ?? ''}>
      <AlertCircle className="h-3 w-3" /> falhou
    </span>
  );
}

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: docs, isLoading } = useQuery({
    queryKey: ['knowledge-docs', orgId],
    queryFn: () => knowledgeService.list(),
    // Auto-atualiza enquanto houver documento indexando.
    refetchInterval: (q) =>
      (q.state.data ?? []).some((d: KnowledgeDocument) => d.status === 'INDEXING') ? 2500 : false,
  });

  const { data: agents } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });
  const agentOptions = useMemo(
    () => (agents ?? []).map((a: any) => ({ id: a.id, name: a.name })),
    [agents],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['knowledge-docs'] });

  const openNew = () => {
    setForm(EMPTY);
    setShowForm(true);
  };
  const openEdit = (doc: KnowledgeDocument) => {
    setForm({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      agentIds: doc.agents.map((a) => a.agent.id),
      mode: 'text',
      file: null,
    });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY);
  };

  const toggleAgent = (id: string) =>
    setForm((f) => ({
      ...f,
      agentIds: f.agentIds.includes(id) ? f.agentIds.filter((a) => a !== id) : [...f.agentIds, id],
    }));

  const handleSave = async () => {
    if (!form.agentIds.length) {
      toast.error('Selecione pelo menos um agente.');
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await knowledgeService.update(form.id, {
          title: form.title.trim(),
          content: form.content,
          agentIds: form.agentIds,
        });
        toast.success('Documento atualizado — reindexando');
      } else if (form.mode === 'pdf') {
        if (!form.file) {
          toast.error('Escolha um arquivo PDF.');
          setSaving(false);
          return;
        }
        await knowledgeService.uploadPdf(form.file, form.agentIds, form.title.trim() || undefined);
        toast.success('PDF enviado — extraindo e indexando');
      } else {
        if (!form.title.trim() || !form.content.trim()) {
          toast.error('Preencha o título e o texto.');
          setSaving(false);
          return;
        }
        await knowledgeService.create({
          title: form.title.trim(),
          content: form.content,
          agentIds: form.agentIds,
        });
        toast.success('Documento criado — indexando');
      }
      closeForm();
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este documento da base?')) return;
    try {
      await knowledgeService.remove(id);
      toast.success('Documento removido');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao remover');
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Base de Conhecimento</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Alimente os agentes com guias, FAQ e modelos. Cada documento é vinculado a agentes específicos e consultado pela IA durante o atendimento.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Adicionar Documento
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {form.id ? 'Editar documento' : 'Novo documento'}
            </h2>
            <button onClick={closeForm} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modo: texto x PDF (só na criação) */}
          {!form.id && (
            <div className="mt-3 inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
              <button
                onClick={() => setForm((f) => ({ ...f, mode: 'text' }))}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${form.mode === 'text' ? 'bg-primary text-primary-foreground' : 'text-zinc-500'}`}
              >
                <Type className="h-3.5 w-3.5" /> Colar texto
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, mode: 'pdf' }))}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${form.mode === 'pdf' ? 'bg-primary text-primary-foreground' : 'text-zinc-500'}`}
              >
                <Upload className="h-3.5 w-3.5" /> Subir PDF
              </button>
            </div>
          )}

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex.: Guia do Auxílio-Acidente"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {form.id || form.mode === 'text' ? (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Conteúdo</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={8}
                placeholder="Cole aqui o texto do guia, FAQ, modelo de proposta, regras do benefício, etc."
                className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          ) : (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Arquivo PDF</label>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} />
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <Upload className="h-4 w-4" />
                {form.file ? form.file.name : 'Escolher PDF...'}
              </button>
              <p className="mt-1 text-xs text-zinc-400">O texto é extraído do PDF (não funciona com PDF escaneado/imagem).</p>
            </div>
          )}

          {/* Seletor de agentes */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Agentes com acesso a este documento
            </label>
            <div className="flex flex-wrap gap-1.5">
              {agentOptions.length === 0 ? (
                <span className="text-xs text-zinc-400">Nenhum agente cadastrado.</span>
              ) : (
                agentOptions.map((a) => {
                  const on = form.agentIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAgent(a.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'}`}
                    >
                      <Bot className="h-3.5 w-3.5" /> {a.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {form.id ? 'Salvar' : 'Adicionar à base'}
            </button>
            <button onClick={closeForm} className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="mt-6 flex-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Agentes</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-300" /></td></tr>
            ) : !docs?.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center">
                  <FileText className="mx-auto h-10 w-10 text-zinc-200 dark:text-zinc-700" />
                  <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">Nenhum documento na base ainda</p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-zinc-400">
                    Adicione guias de benefício, FAQ ou modelos. Os documentos alimentam a IA via RAG e são consultados durante o atendimento.
                  </p>
                </td>
              </tr>
            ) : (
              docs.map((doc) => (
                <tr key={doc.id} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {doc.sourceType === 'PDF' ? <FileText className="h-4 w-4 text-zinc-400" /> : <Type className="h-4 w-4 text-zinc-400" />}
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge doc={doc} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {doc.agents.map((a) => (
                        <span key={a.agent.id} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {a.agent.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(doc)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

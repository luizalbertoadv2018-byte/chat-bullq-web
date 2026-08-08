'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  X,
  Loader2,
  Trash2,
  Pencil,
  CalendarPlus,
  CalendarClock,
  Play,
  Check,
  RotateCcw,
  ListTodo,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  tasksService,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from '@/features/tasks/services/tasks.service';
import { useOrgId } from '@/hooks/use-org-query-key';

// ─── presets do fluxo previdenciário ───────────────────────────────
const CATEGORIES = [
  'Perícia',
  'Emendar inicial',
  'Protocolar',
  'Prazo',
  'Contato cliente',
  'Documentos',
  'Audiência',
  'Recurso',
  'Outro',
];

const PRIORITY_META: Record<TaskPriority, { label: string; dot: string }> = {
  HIGH: { label: 'Alta', dot: 'bg-red-500' },
  MEDIUM: { label: 'Média', dot: 'bg-amber-500' },
  LOW: { label: 'Baixa', dot: 'bg-zinc-400' },
};

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'TODO', label: 'A Fazer', accent: 'text-zinc-500' },
  { status: 'DOING', label: 'Em Andamento', accent: 'text-blue-600 dark:text-blue-400' },
  { status: 'DONE', label: 'Concluído', accent: 'text-green-600 dark:text-green-400' },
];

interface FormState {
  id: string | null;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  dueLocal: string; // datetime-local
}
const EMPTY: FormState = {
  id: null,
  title: '',
  description: '',
  category: '',
  priority: 'MEDIUM',
  dueLocal: '',
};

// ISO (UTC) -> valor do input datetime-local (hora local)
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Formata o prazo pra exibição + flag de atraso
function formatDue(iso: string | null): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const label = d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return { label, overdue: d.getTime() < now.getTime() };
}

// Link "Adicionar ao Google Agenda" — não precisa de credencial, abre na conta do usuário
function googleCalUrl(task: Task): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text = encodeURIComponent(task.title);
  const details = encodeURIComponent(
    [
      task.description ?? '',
      task.category ? `Categoria: ${task.category}` : '',
      task.contact?.name ? `Cliente: ${task.contact.name}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  let dates = '';
  if (task.dueAt) {
    const start = new Date(task.dueAt);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    dates = `&dates=${fmt(start)}/${fmt(end)}`;
  }
  return `${base}&text=${text}&details=${details}${dates}`;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', orgId, onlyOverdue],
    queryFn: () => tasksService.list(onlyOverdue ? { overdue: true } : undefined),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  const openNew = () => {
    setForm(EMPTY);
    setShowForm(true);
  };
  const openEdit = (t: Task) => {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      category: t.category ?? '',
      priority: t.priority,
      dueLocal: isoToLocalInput(t.dueAt),
    });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Dê um título para a tarefa.');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      priority: form.priority,
      dueAt: form.dueLocal ? new Date(form.dueLocal).toISOString() : null,
    };
    try {
      if (form.id) {
        await tasksService.update(form.id, payload);
        toast.success('Tarefa atualizada');
      } else {
        await tasksService.create(payload);
        toast.success('Tarefa criada');
      }
      closeForm();
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (t: Task, status: TaskStatus) => {
    try {
      await tasksService.update(t.id, { status });
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta tarefa?')) return;
    try {
      await tasksService.remove(id);
      toast.success('Tarefa removida');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao remover');
    }
  };

  const byStatus = (s: TaskStatus) => (tasks ?? []).filter((t) => t.status === s);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Tarefas</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Organize os prazos do escritório — perícias, emendas, protocolos, contato com cliente. Cada tarefa pode ir para o seu Google Agenda.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setOnlyOverdue((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              onlyOverdue
                ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20'
                : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800'
            }`}
          >
            <AlertTriangle className="h-4 w-4" /> Atrasadas
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nova tarefa
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {form.id ? 'Editar tarefa' : 'Nova tarefa'}
            </h2>
            <button onClick={closeForm} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex.: Lembrar cliente da perícia — João Silva"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Detalhes (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Anotações, número do processo, o que precisa ser feito..."
              className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Categoria</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const on = form.category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, category: on ? '' : c }))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      on
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Prazo</label>
              <input
                type="datetime-local"
                value={form.dueLocal}
                onChange={(e) => setForm((f) => ({ ...f, dueLocal: e.target.value }))}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Prioridade</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {form.id ? 'Salvar' : 'Criar tarefa'}
            </button>
            <button onClick={closeForm} className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Board */}
      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="mt-6 grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = byStatus(col.status);
            return (
              <div key={col.status} className="flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                  <span className={`text-sm font-semibold ${col.accent}`}>{col.label}</span>
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  {items.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400">
                      <ListTodo className="mx-auto mb-2 h-6 w-6 text-zinc-200 dark:text-zinc-700" />
                      Nada aqui
                    </div>
                  ) : (
                    items.map((t) => {
                      const due = formatDue(t.dueAt);
                      return (
                        <div
                          key={t.id}
                          className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_META[t.priority].dot}`} title={`Prioridade ${PRIORITY_META[t.priority].label}`} />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium text-zinc-800 dark:text-zinc-200 ${t.status === 'DONE' ? 'line-through opacity-60' : ''}`}>
                                {t.title}
                              </p>
                              {t.description && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{t.description}</p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {t.category && (
                                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                    {t.category}
                                  </span>
                                )}
                                {t.contact?.name && (
                                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                    {t.contact.name}
                                  </span>
                                )}
                                {due && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                      due.overdue && t.status !== 'DONE'
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                    }`}
                                  >
                                    <CalendarClock className="h-3 w-3" /> {due.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="mt-2.5 flex items-center gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                            {t.status === 'TODO' && (
                              <button onClick={() => setStatus(t, 'DOING')} title="Iniciar" className="rounded p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20">
                                <Play className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {t.status !== 'DONE' && (
                              <button onClick={() => setStatus(t, 'DONE')} title="Concluir" className="rounded p-1.5 text-zinc-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {t.status === 'DONE' && (
                              <button onClick={() => setStatus(t, 'TODO')} title="Reabrir" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <a
                              href={googleCalUrl(t)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Adicionar ao Google Agenda"
                              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                            </a>
                            <div className="flex-1" />
                            <button onClick={() => openEdit(t)} title="Editar" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(t.id)} title="Remover" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Zap, Paperclip, X, Loader2, Image as ImageIcon, Video, FileText, Music } from 'lucide-react';
import { toast } from 'sonner';
import {
  quickRepliesService,
  type QuickReply,
  type QuickReplyAttachment,
} from '@/features/quick-replies/services/quick-replies.service';
import { useOrgId } from '@/hooks/use-org-query-key';

const FILE_ACCEPT = ['image/*', 'video/*', 'audio/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip'].join(',');

function AttachmentIcon({ type }: { type: QuickReplyAttachment['type'] }) {
  const cls = 'h-4 w-4 shrink-0';
  if (type === 'IMAGE') return <ImageIcon className={cls} />;
  if (type === 'VIDEO') return <Video className={cls} />;
  if (type === 'AUDIO') return <Music className={cls} />;
  return <FileText className={cls} />;
}

interface FormState {
  id: string | null;
  shortcut: string;
  title: string;
  content: string;
  attachments: QuickReplyAttachment[];
}

const EMPTY_FORM: FormState = { id: null, shortcut: '', title: '', content: '', attachments: [] };

export default function QuickRepliesPage() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: replies, isLoading } = useQuery({
    queryKey: ['quick-replies', orgId],
    queryFn: () => quickRepliesService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
  const resetForm = () => setForm(EMPTY_FORM);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const att = await quickRepliesService.uploadAttachment(file);
        setForm((f) => ({ ...f, attachments: [...f.attachments, att] }));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao subir anexo');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) =>
    setForm((f) => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.shortcut.trim() || !form.title.trim()) {
      toast.error('Preencha o atalho e o título.');
      return;
    }
    if (!form.content.trim() && !form.attachments.length) {
      toast.error('Adicione um texto ou pelo menos um anexo.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        shortcut: form.shortcut.trim(),
        title: form.title.trim(),
        content: form.content,
        attachments: form.attachments,
      };
      if (form.id) {
        await quickRepliesService.update(form.id, payload);
        toast.success('Resposta atualizada');
      } else {
        await quickRepliesService.create(payload);
        toast.success('Resposta criada');
      }
      resetForm();
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (qr: QuickReply) => {
    setForm({
      id: qr.id,
      shortcut: qr.shortcut,
      title: qr.title,
      content: qr.content,
      attachments: qr.attachments ?? [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta resposta pronta?')) return;
    try {
      await quickRepliesService.remove(id);
      toast.success('Resposta removida');
      if (form.id === id) resetForm();
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao remover');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Mensagens prontas</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Crie respostas rápidas com texto, imagens, vídeos e arquivos. No chat, digite{' '}
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">/</kbd> seguido do atalho.
          </p>
        </div>
      </div>

      {/* Formulário de criação/edição */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {form.id ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
          {form.id ? 'Editar resposta' : 'Nova resposta'}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Atalho (após a /)
            </label>
            <div className="flex items-center rounded-md border border-zinc-300 bg-white pl-2 focus-within:ring-2 focus-within:ring-primary dark:border-zinc-700 dark:bg-zinc-800">
              <span className="text-sm text-zinc-400">/</span>
              <input
                value={form.shortcut}
                onChange={(e) => setForm((f) => ({ ...f, shortcut: e.target.value }))}
                placeholder="bomdia"
                className="w-full bg-transparent px-1.5 py-2 text-sm focus:outline-none dark:text-zinc-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Saudação de bom dia"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Mensagem</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={3}
            placeholder="Bom dia! Como posso ajudar você hoje?"
            className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* Anexos */}
        <div className="mt-3">
          <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple onChange={handleUpload} className="hidden" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              Anexar mídia
            </button>
            {form.attachments.map((att, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <AttachmentIcon type={att.type} />
                <span className="max-w-[160px] truncate">{att.fileName || att.type}</span>
                <button type="button" onClick={() => removeAttachment(i)} className="text-zinc-400 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {form.id ? 'Salvar alterações' : 'Criar resposta'}
          </button>
          {form.id && (
            <button
              onClick={resetForm}
              className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="mt-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
          ))
        ) : !replies?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Zap className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">Nenhuma mensagem pronta ainda</p>
          </div>
        ) : (
          replies.map((qr) => (
            <div
              key={qr.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary">
                    /{qr.shortcut}
                  </span>
                  <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{qr.title}</span>
                </div>
                {qr.content && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{qr.content}</p>
                )}
                {!!qr.attachments?.length && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {qr.attachments.map((att, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        <AttachmentIcon type={att.type} />
                        <span className="max-w-[120px] truncate">{att.fileName || att.type}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => startEdit(qr)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(qr.id)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

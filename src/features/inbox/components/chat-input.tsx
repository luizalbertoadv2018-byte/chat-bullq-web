'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Mic, Trash2, Square, Loader2, X, Smile, Clock, CalendarClock, Zap, Image as ImageIcon, Video, FileText, Music } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { toast } from 'sonner';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import type { QuickReply } from '@/features/quick-replies/services/quick-replies.service';

/** Formata um Date para o value de um <input type="datetime-local"> (hora local). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Emojis mais usados no atendimento (WhatsApp-style). Sem dependência externa.
const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😘','😅','😉','🙂','🙃','😎',
  '🤩','😇','🥰','😋','😛','😜','🤗','🤔','😐','😴','😢','😭',
  '😤','😡','🥳','😱','😳','🙌','👀','🫡','👍','👎','👏','🙏',
  '💪','👌','✌️','🤝','❤️','🧡','💛','💚','💙','💜','🔥','⭐',
  '✅','❌','⚠️','🎉','🎊','💯','📌','📎','📄','📅','⏰','📞',
];

export interface MentionParticipant {
  phone: string;
  name: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
}

interface ChatInputProps {
  onSend: (text: string, mentions?: string[] | 'all') => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  onSendFile?: (file: File, caption?: string) => Promise<void>;
  /** Agenda o texto para envio futuro. Ausente = esconde o botão de relógio. */
  onSchedule?: (text: string, sendAtIso: string) => Promise<void>;
  disabled?: boolean;
  /** Participantes do grupo. Vazio/ausente desliga o autocomplete de @. */
  participants?: MentionParticipant[];
  /** Respostas prontas da org. Vazio/ausente desliga o atalho "/". */
  quickReplies?: QuickReply[];
  /** Envia uma resposta pronta que tem anexos (texto vira legenda + mídias). */
  onSendQuickReply?: (qr: QuickReply) => Promise<void>;
}

function QuickReplyIcon({ type }: { type: QuickReply['attachments'][number]['type'] }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  if (type === 'IMAGE') return <ImageIcon className={cls} />;
  if (type === 'VIDEO') return <Video className={cls} />;
  if (type === 'AUDIO') return <Music className={cls} />;
  return <FileText className={cls} />;
}

/** Entrada especial do menu: marca todo mundo do grupo. */
const MENTION_ALL = '__all__';
const MENTION_ALL_LABEL = 'todos';

// Espelha o whitelist do backend (UploadsService.ALLOWED_MEDIA_MIME) — o
// accept é só UX; a validação real acontece no upload.
const FILE_ACCEPT = [
  'image/*',
  'video/*',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
].join(',');

export function ChatInput({
  onSend,
  onSendAudio,
  onSendFile,
  onSchedule,
  disabled,
  participants = [],
  quickReplies = [],
  onSendQuickReply,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  // Menções escolhidas nesta mensagem: rótulo exibido -> telefone (ou 'all').
  // No envio, cada rótulo vira `@<telefone>` no texto, que é o que o WhatsApp
  // precisa pra desenhar a menção destacada.
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  // Índice onde começa o `@` que está sendo digitado; null = menu fechado.
  const [mentionAt, setMentionAt] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  // Atalho de respostas prontas: índice onde começa o `/` digitado; null = fechado.
  const [slashAt, setSlashAt] = useState<number | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [sendingQuickReply, setSendingQuickReply] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [isSendingFile, setIsSendingFile] = useState(false);
  // Arquivos em espera pra enviar (colados, escolhidos no clipe ou arrastados).
  // A legenda do textarea vai só no primeiro; os demais seguem sem legenda,
  // igual ao comportamento de álbum do WhatsApp.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // Progresso do envio em lote ("2/5"), pra dar feedback em uploads grandes.
  const [sendProgress, setSendProgress] = useState<{ done: number; total: number } | null>(null);
  // Overlay "solte aqui" enquanto um arquivo é arrastado sobre o composer.
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/dragleave disparam também nos filhos; um contador evita que o
  // overlay pisque ao passar o cursor entre elementos internos.
  const dragDepth = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

  // URLs de preview só pra arquivos de imagem; revoga em toda troca/unmount.
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());
  useEffect(() => {
    const map = new Map<File, string>();
    for (const f of pendingFiles) {
      if (f.type.startsWith('image/')) map.set(f, URL.createObjectURL(f));
    }
    setPreviews(map);
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url);
    };
  }, [pendingFiles]);

  /** Adiciona arquivos à fila de envio (dedup por nome+tamanho+data). */
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setPendingFiles((prev) => {
      const key = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
      const seen = new Set(prev.map(key));
      const fresh = arr.filter((f) => !seen.has(key(f)));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);

  const removePendingAt = (idx: number) =>
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = useCallback(async () => {
    // Envio dos arquivos em espera (legenda opcional só no primeiro).
    if (pendingFiles.length > 0) {
      if (isSendingFile || !onSendFile) return;
      const caption = text.trim();
      const files = pendingFiles;
      setIsSendingFile(true);
      try {
        for (let i = 0; i < files.length; i++) {
          setSendProgress({ done: i, total: files.length });
          await onSendFile(files[i], i === 0 && caption ? caption : undefined);
        }
        setPendingFiles([]);
        setText('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || err?.message || 'Erro ao enviar arquivo',
        );
      } finally {
        setIsSendingFile(false);
        setSendProgress(null);
      }
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      // Troca `@Fulano` pelo `@<telefone>` que o protocolo exige, e junta os
      // telefones de quem realmente sobrou no texto (menção apagada não vai).
      let outbound = trimmed;
      const phones: string[] = [];
      let all = false;
      for (const [label, phone] of picked) {
        const token = `@${label}`;
        if (!outbound.includes(token)) continue;
        if (phone === MENTION_ALL) {
          all = true;
          continue;
        }
        outbound = outbound.split(token).join(`@${phone}`);
        phones.push(phone);
      }
      const mentions = all ? 'all' : phones.length ? phones : undefined;
      await onSend(outbound, mentions);
      setText('');
      setPicked(new Map());
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  }, [pendingFiles, text, isSending, isSendingFile, onSend, onSendFile, picked]);

  const handleSchedule = useCallback(
    async (close: () => void) => {
      const trimmed = text.trim();
      if (!trimmed || !onSchedule || !scheduleAt) return;
      const when = new Date(scheduleAt);
      if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) {
        toast.error('Escolha uma data/hora pelo menos 1 minuto no futuro.');
        return;
      }
      setIsScheduling(true);
      try {
        await onSchedule(trimmed, when.toISOString());
        setText('');
        setPicked(new Map());
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        close();
        toast.success('Mensagem agendada');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Erro ao agendar');
      } finally {
        setIsScheduling(false);
      }
    },
    [text, onSchedule, scheduleAt],
  );

  // Lista filtrada do menu de menção. "todos" só aparece sem busca ou quando
  // o texto digitado casa com ele.
  const mentionMatches = (() => {
    if (mentionAt === null || !participants.length) return [];
    const q = mentionQuery.toLowerCase();
    const people = participants.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q),
    );
    const withAll: MentionParticipant[] =
      !q || MENTION_ALL_LABEL.startsWith(q)
        ? [{ phone: MENTION_ALL, name: MENTION_ALL_LABEL, avatarUrl: null, isAdmin: false }]
        : [];
    return [...withAll, ...people].slice(0, 8);
  })();

  /** Fecha o menu sem escolher nada. */
  const closeMention = useCallback(() => {
    setMentionAt(null);
    setMentionQuery('');
    setMentionIndex(0);
  }, []);

  /**
   * Reavalia se o cursor está dentro de um `@algo`. Um `@` só abre o menu
   * quando está no começo do texto ou depois de espaço — assim e-mail não
   * dispara o autocomplete.
   */
  const syncMentionState = useCallback(
    (value: string, caret: number) => {
      if (!participants.length) return;
      const upto = value.slice(0, caret);
      const at = upto.lastIndexOf('@');
      if (at === -1) return closeMention();
      const before = at > 0 ? upto[at - 1] : ' ';
      const query = upto.slice(at + 1);
      // Espaço encerra a busca — nomes com espaço são escolhidos pelo menu,
      // não digitados por inteiro.
      if (!/\s/.test(before) || /\s/.test(query)) return closeMention();
      setMentionAt(at);
      setMentionQuery(query);
      setMentionIndex(0);
    },
    [participants.length, closeMention],
  );

  /** Insere a menção escolhida no lugar do `@parcial` que estava sendo digitado. */
  const applyMention = useCallback(
    (p: MentionParticipant) => {
      if (mentionAt === null) return;
      const el = textareaRef.current;
      const caret = el?.selectionStart ?? text.length;
      const label = p.phone === MENTION_ALL ? MENTION_ALL_LABEL : p.name;
      const next = `${text.slice(0, mentionAt)}@${label} ${text.slice(caret)}`;
      setPicked((prev) => new Map(prev).set(label, p.phone));
      setText(next);
      closeMention();
      // Cursor logo depois da menção inserida.
      const pos = mentionAt + label.length + 2;
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(pos, pos);
      });
    },
    [mentionAt, text, closeMention],
  );

  // Lista filtrada do menu de respostas prontas (atalho "/").
  const slashMatches = (() => {
    if (slashAt === null || !quickReplies.length) return [];
    const q = slashQuery.toLowerCase();
    return quickReplies
      .filter(
        (r) =>
          !q ||
          r.shortcut.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q),
      )
      .slice(0, 8);
  })();

  const closeSlash = useCallback(() => {
    setSlashAt(null);
    setSlashQuery('');
    setSlashIndex(0);
  }, []);

  /**
   * Reavalia se o cursor está logo após um `/atalho`. O `/` só abre o menu
   * quando está no começo do texto ou depois de espaço (não dentro de URL).
   */
  const syncSlashState = useCallback(
    (value: string, caret: number) => {
      if (!quickReplies.length) return;
      const upto = value.slice(0, caret);
      const at = upto.lastIndexOf('/');
      if (at === -1) return closeSlash();
      const before = at > 0 ? upto[at - 1] : ' ';
      const query = upto.slice(at + 1);
      if (!/\s/.test(before) || /\s/.test(query)) return closeSlash();
      setSlashAt(at);
      setSlashQuery(query);
      setSlashIndex(0);
    },
    [quickReplies.length, closeSlash],
  );

  /**
   * Aplica a resposta pronta escolhida. Sem anexos → insere o texto no
   * lugar do `/atalho` (atendente edita/envia). Com anexos → dispara o envio
   * imediato (texto + mídias) e limpa o `/atalho` do input.
   */
  const applyQuickReply = useCallback(
    async (qr: QuickReply) => {
      if (slashAt === null) return;
      const el = textareaRef.current;
      const caret = el?.selectionStart ?? text.length;
      const hasAttachments = (qr.attachments?.length ?? 0) > 0;

      if (hasAttachments && onSendQuickReply) {
        // Remove o "/atalho" do texto antes de disparar o envio.
        const cleaned = `${text.slice(0, slashAt)}${text.slice(caret)}`;
        setText(cleaned);
        closeSlash();
        setSendingQuickReply(true);
        try {
          await onSendQuickReply(qr);
        } catch (err: any) {
          toast.error(
            err?.response?.data?.message || err?.message || 'Erro ao enviar resposta pronta',
          );
        } finally {
          setSendingQuickReply(false);
        }
        return;
      }

      // Só texto: substitui o "/atalho" pelo conteúdo.
      const next = `${text.slice(0, slashAt)}${qr.content}${text.slice(caret)}`;
      setText(next);
      closeSlash();
      const pos = slashAt + qr.content.length;
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(pos, pos);
        el?.dispatchEvent(new Event('input', { bubbles: true }));
      });
    },
    [slashAt, text, onSendQuickReply, closeSlash],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items || !onSendFile) return;
      const images: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          // Prints vêm sem nome útil ("image.png"); dá um nome único p/ o upload.
          const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
          const named =
            file.name && file.name !== 'image.png'
              ? file
              : new File([file], `pasted-${Date.now()}-${i}.${ext}`, { type: file.type });
          images.push(named);
        }
      }
      if (images.length) {
        e.preventDefault(); // evita colar o "path" como texto
        addFiles(images);
      }
      // sem imagem no clipboard → deixa o paste de texto normal seguir
    },
    [onSendFile, addFiles],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Com o menu de respostas prontas aberto, as setas/Enter/Tab pertencem a ele.
    if (slashMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyQuickReply(slashMatches[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSlash();
        return;
      }
    }
    // Com o menu de menção aberto, as setas/Enter/Tab pertencem a ele.
    if (mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + mentionMatches.length) % mentionMatches.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMention(mentionMatches[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMention();
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((prev) => prev.slice(0, start) + emoji + prev.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleSendAudio = useCallback(async () => {
    if (!recorder.blob || !onSendAudio) return;
    setIsSendingAudio(true);
    try {
      await onSendAudio(recorder.blob);
      recorder.reset();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar áudio',
      );
    } finally {
      setIsSendingAudio(false);
    }
  }, [recorder, onSendAudio]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      // Limpa o value pra permitir reescolher o MESMO arquivo em seguida —
      // sem isso o onChange não dispara na segunda escolha.
      e.target.value = '';
      if (files?.length) addFiles(files);
    },
    [addFiles],
  );

  // --- Drag & drop de arquivos sobre o composer -------------------------
  const hasDraggedFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes('Files');

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault(); // necessário pra o browser aceitar o drop
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      dragDepth.current = 0;
      setIsDragging(false);
      if (!onSendFile) return;
      const files = e.dataTransfer?.files;
      if (files?.length) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [onSendFile, addFiles],
  );

  const formatElapsed = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (disabled) {
    return (
      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
        Conversa encerrada — reabra para enviar mensagens
      </div>
    );
  }

  // RECORDING MODE: shows a big bar with a pulsing red dot and the timer.
  if (recorder.state === 'recording') {
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-500/10">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
            aria-label="Cancelar gravação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="font-medium tabular-nums">{formatElapsed(recorder.elapsedMs)}</span>
            <span className="text-xs opacity-70">Gravando…</span>
          </div>
          <button
            onClick={recorder.stop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
            aria-label="Parar gravação"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // PREVIEW MODE: the recording finished, user can listen/discard/send.
  if (recorder.state === 'stopped' && recorder.blob) {
    const audioSrc = URL.createObjectURL(recorder.blob);
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
            aria-label="Descartar áudio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <audio
            controls
            src={audioSrc}
            className="h-9 flex-1 min-w-0"
          />
          <button
            onClick={handleSendAudio}
            disabled={isSendingAudio}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar áudio"
          >
            {isSendingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
        </div>
        {recorder.error && (
          <p className="mt-1 text-xs text-red-500">{recorder.error}</p>
        )}
      </div>
    );
  }

  // IDLE MODE: text input + mic button.
  const canRecord = !!onSendAudio;
  const hasPending = pendingFiles.length > 0;
  const showMic = canRecord && !text.trim() && !hasPending;

  return (
    <div
      className="relative border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && onSendFile && (
        <div className="pointer-events-none absolute inset-1 z-40 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm dark:bg-primary/10">
          <Paperclip className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium text-primary">Solte os arquivos aqui pra enviar</p>
        </div>
      )}
      {mentionMatches.length > 0 && (
        <div className="absolute bottom-full left-3 z-20 mb-1 max-h-64 w-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {mentionMatches.map((p, i) => (
            <button
              key={p.phone}
              type="button"
              // onMouseDown: o onBlur do textarea fecharia o menu antes do click.
              onMouseDown={(e) => {
                e.preventDefault();
                applyMention(p);
              }}
              onMouseEnter={() => setMentionIndex(i)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                i === mentionIndex
                  ? 'bg-zinc-100 dark:bg-zinc-800'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              {p.phone === MENTION_ALL ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                  @
                </span>
              ) : p.avatarUrl ? (
                <img
                  src={p.avatarUrl}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700"
                />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">
                  {p.phone === MENTION_ALL ? `@${MENTION_ALL_LABEL}` : p.name}
                </span>
                {p.phone === MENTION_ALL ? (
                  <span className="ml-2 text-xs text-zinc-400">
                    marca o grupo inteiro
                  </span>
                ) : (
                  p.name.replace(/\D/g, '') !== p.phone && (
                    <span className="ml-2 text-xs text-zinc-400">{p.phone}</span>
                  )
                )}
              </span>
              {p.isAdmin && (
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  admin
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {slashMatches.length > 0 && (
        <div className="absolute bottom-full left-3 z-20 mb-1 max-h-72 w-96 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            <Zap className="h-3 w-3" /> Respostas prontas
          </div>
          {slashMatches.map((qr, i) => (
            <button
              key={qr.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyQuickReply(qr);
              }}
              onMouseEnter={() => setSlashIndex(i)}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                i === slashIndex
                  ? 'bg-zinc-100 dark:bg-zinc-800'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex w-full items-center gap-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary">
                  /{qr.shortcut}
                </span>
                <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {qr.title}
                </span>
                {!!qr.attachments?.length && (
                  <span className="ml-auto flex items-center gap-1 text-zinc-400">
                    {qr.attachments.slice(0, 3).map((att, k) => (
                      <QuickReplyIcon key={k} type={att.type} />
                    ))}
                  </span>
                )}
              </div>
              {qr.content && (
                <span className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {qr.content}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {hasPending && (
        <div className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              {pendingFiles.length === 1
                ? '1 arquivo'
                : `${pendingFiles.length} arquivos`}
              {isSendingFile && sendProgress
                ? ` · enviando ${sendProgress.done + 1}/${sendProgress.total}…`
                : ''}
            </span>
            {!isSendingFile && (
              <button
                type="button"
                onClick={() => setPendingFiles([])}
                className="text-[11px] text-zinc-400 hover:text-red-500"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pendingFiles.map((file, idx) => {
              const preview = previews.get(file);
              return (
                <div
                  key={`${file.name}-${idx}`}
                  className="group/att relative flex h-20 w-20 shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                  title={file.name}
                >
                  {preview ? (
                    <img src={preview} alt={file.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-zinc-500 dark:text-zinc-400">
                      <FileText className="h-6 w-6" />
                      <span className="w-full truncate text-center text-[9px] leading-tight">
                        {file.name}
                      </span>
                    </div>
                  )}
                  {!isSendingFile && (
                    <button
                      type="button"
                      onClick={() => removePendingAt(idx)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/att:opacity-100"
                      aria-label={`Remover ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
            {!isSendingFile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 text-zinc-400 hover:border-primary hover:text-primary dark:border-zinc-600"
                aria-label="Adicionar mais arquivos"
              >
                <Paperclip className="h-5 w-5" />
                <span className="text-[9px]">Adicionar</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!onSendFile || isSendingFile}
          className="mb-1 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800"
          aria-label="Anexar arquivo"
        >
          {isSendingFile ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <Popover className="relative">
          <PopoverButton
            type="button"
            className="mb-1 rounded-lg p-2 text-zinc-400 outline-none hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            aria-label="Emojis"
          >
            <Smile className="h-5 w-5" />
          </PopoverButton>
          <PopoverPanel
            anchor="top start"
            className="z-30 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg outline-none dark:border-zinc-700 dark:bg-zinc-900 [--anchor-gap:0.5rem]"
          >
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => insertEmoji(e)}
                  className="rounded-md p-1 text-lg leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {e}
                </button>
              ))}
            </div>
          </PopoverPanel>
        </Popover>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            syncMentionState(e.target.value, e.target.selectionStart ?? 0);
            syncSlashState(e.target.value, e.target.selectionStart ?? 0);
          }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onClick={(e) => {
            syncMentionState(
              (e.target as HTMLTextAreaElement).value,
              (e.target as HTMLTextAreaElement).selectionStart ?? 0,
            );
            syncSlashState(
              (e.target as HTMLTextAreaElement).value,
              (e.target as HTMLTextAreaElement).selectionStart ?? 0,
            );
          }}
          onBlur={() => {
            setTimeout(closeMention, 120);
            setTimeout(closeSlash, 120);
          }}
          onPaste={handlePaste}
          placeholder={hasPending ? 'Adicione uma legenda...' : 'Digite uma mensagem...'}
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {showMic ? (
          <button
            onClick={recorder.start}
            type="button"
            className="mb-1 rounded-lg bg-zinc-100 p-2.5 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Gravar áudio"
          >
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <>
            {onSchedule && !hasPending && !!text.trim() && (
              <Popover className="relative">
                <PopoverButton
                  type="button"
                  onClick={() =>
                    setScheduleAt(toLocalInput(new Date(Date.now() + 3600_000)))
                  }
                  className="mb-1 rounded-lg p-2.5 text-zinc-400 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="Agendar envio"
                  title="Agendar envio"
                >
                  <Clock className="h-5 w-5" />
                </PopoverButton>
                <PopoverPanel
                  anchor="top end"
                  className="z-30 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg outline-none dark:border-zinc-700 dark:bg-zinc-900 [--anchor-gap:0.5rem]"
                >
                  {({ close }) => (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        Agendar envio
                      </p>
                      <input
                        type="datetime-local"
                        value={scheduleAt}
                        min={toLocalInput(new Date(Date.now() + 60_000))}
                        onChange={(e) => setScheduleAt(e.target.value)}
                        className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleSchedule(close)}
                        disabled={isScheduling || !scheduleAt}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isScheduling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                        Agendar
                      </button>
                    </div>
                  )}
                </PopoverPanel>
              </Popover>
            )}
            <button
              onClick={handleSubmit}
              disabled={(!text.trim() && !hasPending) || isSending || isSendingFile}
              className="mb-1 rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              aria-label="Enviar mensagem"
            >
              {isSending || isSendingFile ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </>
        )}
      </div>
      {recorder.error && (
        <p className="mt-1.5 text-xs text-red-500">{recorder.error}</p>
      )}
    </div>
  );
}

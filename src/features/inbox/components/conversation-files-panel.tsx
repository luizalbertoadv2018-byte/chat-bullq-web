'use client';

import { useMemo, useState, useCallback, type ReactNode, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  Paperclip,
  X,
  Play,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  File as FileIcon,
  Download,
  CheckSquare,
  Square,
  Link2,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useResolvedMedia } from '../hooks/use-resolved-media';
import { inboxService, type Message } from '../services/inbox.service';

interface ConversationFilesPanelProps {
  conversationId: string;
  onClose: () => void;
}

type Tab = 'media' | 'files' | 'links';

/**
 * Galeria de arquivos da conversa (estilo LiderHub): abas Mídia / Arquivos /
 * Links. Mídia e Arquivos têm modo de seleção com download em lote. Links são
 * extraídos das mensagens de texto que contêm URL. Cada mídia resolve a URL
 * tocável via o mesmo hook das bolhas do chat.
 */
export function ConversationFilesPanel({
  conversationId,
  onClose,
}: ConversationFilesPanelProps) {
  const [tab, setTab] = useState<Tab>('media');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['conversation-media', conversationId],
    queryFn: () => inboxService.getConversationMedia(conversationId, 1, 100),
    staleTime: 10000,
  });
  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ['conversation-links', conversationId],
    queryFn: () => inboxService.getConversationLinks(conversationId, 1, 100),
    staleTime: 10000,
    enabled: tab === 'links',
  });

  const messages = useMemo(() => mediaData?.messages ?? [], [mediaData]);
  const visual = useMemo(
    () => messages.filter((m) => ['IMAGE', 'VIDEO', 'STICKER'].includes(m.type)),
    [messages],
  );
  const files = useMemo(
    () => messages.filter((m) => ['DOCUMENT', 'AUDIO'].includes(m.type)),
    [messages],
  );
  const links = useMemo(() => extractLinks(linksData?.messages ?? []), [linksData]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const currentItems = tab === 'media' ? visual : files;
  const selectAll = useCallback(() => {
    setSelected(new Set(currentItems.map((m) => m.id)));
  }, [currentItems]);

  const downloadSelected = useCallback(async () => {
    const targets = messages.filter((m) => selected.has(m.id));
    if (targets.length === 0) return;
    setDownloading(true);
    let ok = 0;
    for (const m of targets) {
      try {
        await downloadMessageFile(m);
        ok += 1;
      } catch {
        // segue pro próximo; o resumo no fim informa quantos foram
      }
      await sleep(350); // escalona pra não disparar o bloqueio de múltiplos downloads
    }
    setDownloading(false);
    toast.success(
      `${ok} de ${targets.length} arquivo${targets.length === 1 ? '' : 's'} baixado${ok === 1 ? '' : 's'}`,
    );
    exitSelectMode();
  }, [messages, selected, exitSelectMode]);

  const canSelect = tab !== 'links';
  const totalCount = messages.length;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Arquivos
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {canSelect && !selectMode && currentItems.length > 0 && (
            <button
              onClick={() => setSelectMode(true)}
              title="Selecionar para baixar"
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Fechar arquivos"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b border-zinc-200 px-2 dark:border-zinc-800">
        <TabButton active={tab === 'media'} onClick={() => setTab('media')} label="Mídia" count={visual.length} />
        <TabButton active={tab === 'files'} onClick={() => setTab('files')} label="Arquivos" count={files.length} />
        <TabButton active={tab === 'links'} onClick={() => setTab('links')} label="Links" count={tab === 'links' ? links.length : undefined} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'links' ? (
          linksLoading ? (
            <Spinner />
          ) : links.length === 0 ? (
            <Empty icon={<Link2 className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />} text="Nenhum link nesta conversa" />
          ) : (
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <LinkRow key={l.url} url={l.url} />
              ))}
            </div>
          )
        ) : mediaLoading ? (
          <Spinner />
        ) : currentItems.length === 0 ? (
          <Empty
            icon={<Paperclip className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />}
            text={tab === 'media' ? 'Nenhuma mídia ainda' : 'Nenhum documento ou áudio ainda'}
          />
        ) : tab === 'media' ? (
          <div className="grid grid-cols-3 gap-1.5">
            {visual.map((m) => (
              <VisualTile
                key={m.id}
                message={m}
                selectMode={selectMode}
                selected={selected.has(m.id)}
                onToggle={() => toggleSelect(m.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {files.map((m) => (
              <FileRow
                key={m.id}
                message={m}
                selectMode={selectMode}
                selected={selected.has(m.id)}
                onToggle={() => toggleSelect(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rodapé de seleção */}
      {selectMode && canSelect && (
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Todos
            </button>
            <span className="text-xs text-zinc-400">·</span>
            <button
              onClick={exitSelectMode}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancelar
            </button>
          </div>
          <button
            onClick={downloadSelected}
            disabled={selected.size === 0 || downloading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Baixar ({selected.size})
          </button>
        </div>
      )}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'text-primary'
          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
      }`}
    >
      {label}
      {typeof count === 'number' && count > 0 && (
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {count}
        </span>
      )}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
    </div>
  );
}

function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 pt-12 text-center">
      {icon}
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{text}</p>
    </div>
  );
}

function VisualTile({
  message,
  selectMode,
  selected,
  onToggle,
}: {
  message: Message;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const { url, loading, retry } = useResolvedMedia(message, { mode: 'eager' });
  const isVideo = message.type === 'VIDEO';

  const handleClick = (e: MouseEvent) => {
    if (selectMode) {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <a
      href={selectMode ? undefined : url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={(message.content?.caption as string) || 'Abrir'}
      className={`group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 ${
        selected ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-zinc-950' : ''
      }`}
    >
      {loading && !url ? (
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      ) : url ? (
        isVideo ? (
          <>
            <video src={url} className="h-full w-full object-cover" muted preload="metadata" onError={() => void retry()} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="h-5 w-5 text-white drop-shadow" />
            </div>
          </>
        ) : (
          <img
            src={url}
            alt={(message.content?.caption as string) || 'Mídia'}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
            onError={() => void retry()}
          />
        )
      ) : (
        <FileIcon className="h-4 w-4 text-zinc-400" />
      )}
      {selectMode && (
        <span
          className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-md border ${
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-white/80 bg-black/30 text-transparent'
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </a>
  );
}

function FileRow({
  message,
  selectMode,
  selected,
  onToggle,
}: {
  message: Message;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const { url, loading } = useResolvedMedia(message, { mode: 'eager' });
  const name =
    (message.content?.fileName as string) ||
    (message.type === 'AUDIO' ? 'Áudio' : 'Documento');
  const mime = (message.content?.mimeType as string) || '';
  const size = message.content?.fileSize as number | undefined;
  const Icon = pickIcon(message.type, mime);

  const handleClick = (e: MouseEvent) => {
    if (selectMode) {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <a
      href={selectMode ? undefined : url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      download={name}
      onClick={handleClick}
      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
        selected ? 'bg-primary/5 ring-1 ring-primary/40' : ''
      }`}
    >
      {selectMode && (
        <span className="shrink-0 text-primary">
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-zinc-400" />}
        </span>
      )}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">{name}</span>
        <span className="block text-[11px] text-zinc-400">{formatSize(size)}</span>
      </span>
      {!selectMode &&
        (loading && !url ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
        ) : (
          <Download className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        ))}
    </a>
  );
}

function LinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const domain = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <Link2 className="h-4 w-4" />
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
        title={url}
      >
        <span className="block truncate text-xs font-medium text-primary">{domain}</span>
        <span className="block truncate text-[11px] text-zinc-400">{url}</span>
      </a>
      <button
        onClick={copy}
        title="Copiar link"
        className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir"
        className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

function extractLinks(messages: Message[]): { url: string; messageId: string }[] {
  const seen = new Set<string>();
  const out: { url: string; messageId: string }[] = [];
  for (const m of messages) {
    const text = typeof m.content?.text === 'string' ? m.content.text : '';
    const found = text.match(URL_RE) ?? [];
    for (const raw of found) {
      const url = raw.replace(/[.,;:)]+$/, ''); // tira pontuação final
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ url, messageId: m.id });
    }
  }
  return out;
}

async function downloadMessageFile(message: Message): Promise<void> {
  // Resolve a URL tocável (para inbound cujo content.mediaUrl é .enc/CDN).
  let url = typeof message.content?.mediaUrl === 'string' ? message.content.mediaUrl : '';
  if (!url || /\.enc(\?|$)/i.test(url) || /mmg\.whatsapp\.net/i.test(url)) {
    const resolved = await inboxService.resolveMediaUrl(message.id);
    url = resolved.url;
  }
  const filename =
    (message.content?.fileName as string) ||
    `arquivo-${message.id}${extFromMime((message.content?.mimeType as string) || '')}`;

  // Mesmo-origin (nossos uploads): baixa via blob pra forçar o download com o
  // nome certo. Cross-origin (CDN do provider): abre em nova aba (o browser
  // bloquearia o download forçado por CORS).
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch falhou');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extFromMime(mime: string): string {
  if (!mime) return '';
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'application/pdf': '.pdf',
  };
  return map[mime] || '';
}

function pickIcon(type: string, mime: string) {
  if (type === 'AUDIO' || mime.startsWith('audio/')) return FileAudio;
  if (mime.includes('pdf')) return FileText;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed')) return FileArchive;
  if (mime.includes('word') || mime.includes('document') || mime.startsWith('text/')) return FileText;
  return FileIcon;
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

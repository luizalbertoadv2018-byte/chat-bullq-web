'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { useResolvedMedia } from '../hooks/use-resolved-media';
import { inboxService, type Message } from '../services/inbox.service';

interface ConversationFilesPanelProps {
  conversationId: string;
  onClose: () => void;
}

/**
 * Galeria de arquivos da conversa: lista todas as mídias já trocadas
 * (imagem/vídeo/sticker em grade + documentos/áudios em lista). Puxa do
 * endpoint `/messages?mediaOnly=true`, que já deduplica grupos de segmento.
 * Cada tile resolve a URL tocável via o mesmo hook das bolhas do chat.
 */
export function ConversationFilesPanel({
  conversationId,
  onClose,
}: ConversationFilesPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['conversation-media', conversationId],
    queryFn: () => inboxService.getConversationMedia(conversationId, 1, 100),
    staleTime: 10000,
  });

  const messages = useMemo(() => data?.messages ?? [], [data]);
  const visual = useMemo(
    () => messages.filter((m) => ['IMAGE', 'VIDEO', 'STICKER'].includes(m.type)),
    [messages],
  );
  const files = useMemo(
    () => messages.filter((m) => ['DOCUMENT', 'AUDIO'].includes(m.type)),
    [messages],
  );

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Arquivos
          </h2>
          {messages.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {messages.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Fechar arquivos"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center px-6 pt-12 text-center">
            <Paperclip className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Nenhum arquivo nesta conversa ainda
            </p>
            <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              Imagens, vídeos, áudios e documentos aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visual.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Mídia
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {visual.map((m) => (
                    <VisualTile key={m.id} message={m} />
                  ))}
                </div>
              </div>
            )}
            {files.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Documentos e áudios
                </div>
                <div className="flex flex-col gap-1">
                  {files.map((m) => (
                    <FileRow key={m.id} message={m} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function VisualTile({ message }: { message: Message }) {
  const { url, loading, retry } = useResolvedMedia(message, { mode: 'eager' });
  const isVideo = message.type === 'VIDEO';

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      title={(message.content?.caption as string) || 'Abrir'}
      className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
    >
      {loading && !url ? (
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      ) : url ? (
        isVideo ? (
          <>
            <video
              src={url}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
              onError={() => void retry()}
            />
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
    </a>
  );
}

function FileRow({ message }: { message: Message }) {
  const { url, loading } = useResolvedMedia(message, { mode: 'eager' });
  const name =
    (message.content?.fileName as string) ||
    (message.type === 'AUDIO' ? 'Áudio' : 'Documento');
  const mime = (message.content?.mimeType as string) || '';
  const size = message.content?.fileSize as number | undefined;
  const Icon = pickIcon(message.type, mime);

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      download={name}
      className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {name}
        </span>
        <span className="block text-[11px] text-zinc-400">
          {formatSize(size)}
        </span>
      </span>
      {loading && !url ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
      ) : (
        <Download className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      )}
    </a>
  );
}

function pickIcon(type: string, mime: string) {
  if (type === 'AUDIO' || mime.startsWith('audio/')) return FileAudio;
  if (mime.includes('pdf')) return FileText;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return FileSpreadsheet;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed'))
    return FileArchive;
  if (mime.includes('word') || mime.includes('document') || mime.startsWith('text/'))
    return FileText;
  return FileIcon;
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

import { api } from '@/lib/api';

export type QuickReplyMediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';

export interface QuickReplyAttachment {
  type: QuickReplyMediaType;
  url: string;
  mimeType?: string;
  fileName?: string;
  size?: number;
}

export interface QuickReply {
  id: string;
  organizationId: string;
  shortcut: string;
  title: string;
  content: string;
  attachments: QuickReplyAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface QuickReplyPayload {
  shortcut: string;
  title: string;
  content?: string;
  attachments?: QuickReplyAttachment[];
}

/** Deriva o tipo de mídia a partir do mime. */
export function mediaTypeFromMime(mime: string): QuickReplyMediaType {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

export const quickRepliesService = {
  async list(): Promise<QuickReply[]> {
    const { data } = await api.get('/quick-replies');
    return (data.data ?? data ?? []).map((r: QuickReply) => ({
      ...r,
      attachments: Array.isArray(r.attachments) ? r.attachments : [],
    }));
  },

  async create(payload: QuickReplyPayload): Promise<QuickReply> {
    const { data } = await api.post('/quick-replies', payload);
    return data.data ?? data;
  },

  async update(id: string, payload: Partial<QuickReplyPayload>): Promise<QuickReply> {
    const { data } = await api.patch(`/quick-replies/${id}`, payload);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/quick-replies/${id}`);
  },

  /**
   * Sobe um arquivo p/ o storage do app e devolve o anexo já no formato do
   * quick reply. Reusa o mesmo endpoint de mídia do chat.
   */
  async uploadAttachment(file: File): Promise<QuickReplyAttachment> {
    const form = new FormData();
    form.append('file', file, file.name);
    const { data } = await api.post('/messages/uploads/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    const up = data.data ?? data;
    const mime = up.mimeType || file.type || '';
    return {
      type: mediaTypeFromMime(mime),
      url: up.url,
      mimeType: mime,
      fileName: up.filename || file.name,
      size: up.size,
    };
  },
};

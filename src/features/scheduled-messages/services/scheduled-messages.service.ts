import { api } from '@/lib/api';

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  type: string;
  content: Record<string, any>;
  sendAt: string;
  contactName: string;
  contactAvatar: string | null;
  channelName: string | null;
}

export const scheduledMessagesService = {
  async list(): Promise<ScheduledMessage[]> {
    const { data } = await api.get('/scheduled-messages');
    return (data.data ?? data ?? []) as ScheduledMessage[];
  },

  async schedule(payload: {
    conversationId: string;
    type: string;
    content: Record<string, any>;
    sendAt: string; // ISO
    replyToMessageId?: string;
  }): Promise<{ id: string; sendAt: string }> {
    const { data } = await api.post('/scheduled-messages', payload);
    return data.data ?? data;
  },

  async cancel(id: string): Promise<void> {
    await api.delete(`/scheduled-messages/${id}`);
  },
};

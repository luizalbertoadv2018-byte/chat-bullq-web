import { api } from '@/lib/api';

export interface KnowledgeAgentRef {
  agent: { id: string; name: string };
}

export interface KnowledgeDocument {
  id: string;
  organizationId: string;
  title: string;
  sourceType: 'TEXT' | 'PDF';
  content: string;
  fileName: string | null;
  status: 'INDEXING' | 'READY' | 'FAILED';
  chunkCount: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  agents: KnowledgeAgentRef[];
}

export interface CreateKnowledgePayload {
  title: string;
  content: string;
  agentIds: string[];
}

export const knowledgeService = {
  async list(): Promise<KnowledgeDocument[]> {
    const { data } = await api.get('/knowledge/documents');
    return data.data ?? data ?? [];
  },

  async create(payload: CreateKnowledgePayload): Promise<KnowledgeDocument> {
    const { data } = await api.post('/knowledge/documents', payload);
    return data.data ?? data;
  },

  /** Sobe um PDF; backend extrai o texto e indexa. */
  async uploadPdf(
    file: File,
    agentIds: string[],
    title?: string,
  ): Promise<KnowledgeDocument> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('agentIds', JSON.stringify(agentIds));
    if (title) form.append('title', title);
    const { data } = await api.post('/knowledge/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data.data ?? data;
  },

  async update(
    id: string,
    payload: Partial<CreateKnowledgePayload>,
  ): Promise<KnowledgeDocument> {
    const { data } = await api.patch(`/knowledge/documents/${id}`, payload);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/knowledge/documents/${id}`);
  },
};

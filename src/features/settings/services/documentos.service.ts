import { api } from '@/lib/api';

export interface DocumentoBeneficio {
  id: string;
  organizationId: string;
  pipelineId: string;
  name: string;
  order: number;
}

export const documentosService = {
  async listByPipeline(pipelineId: string): Promise<DocumentoBeneficio[]> {
    const { data } = await api.get('/documentos-beneficio', { params: { pipelineId } });
    return data.data;
  },
  async create(payload: { pipelineId: string; name: string }): Promise<DocumentoBeneficio> {
    const { data } = await api.post('/documentos-beneficio', payload);
    return data.data;
  },
  async update(id: string, payload: { name?: string; order?: number }): Promise<DocumentoBeneficio> {
    const { data } = await api.patch(`/documentos-beneficio/${id}`, payload);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/documentos-beneficio/${id}`);
  },
};

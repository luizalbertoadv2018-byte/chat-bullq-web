import { api } from '@/lib/api';

export interface Situacao {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  order: number;
}

export const situacoesService = {
  async list(): Promise<Situacao[]> {
    const { data } = await api.get('/situacoes');
    return data.data;
  },
  async create(payload: { name: string; color?: string }): Promise<Situacao> {
    const { data } = await api.post('/situacoes', payload);
    return data.data;
  },
  async update(
    id: string,
    payload: { name?: string; color?: string; order?: number },
  ): Promise<Situacao> {
    const { data } = await api.patch(`/situacoes/${id}`, payload);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/situacoes/${id}`);
  },
};

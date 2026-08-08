import { api } from '@/lib/api';

export type TaskStatus = 'TODO' | 'DOING' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TaskContactRef {
  id: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
}
export interface TaskUserRef {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: string | null;
  dueAt: string | null;
  completedAt: string | null;
  contactId: string | null;
  conversationId: string | null;
  assignedToId: string | null;
  calendarEventId: string | null;
  calendarHtmlLink: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: TaskContactRef | null;
  assignedTo?: TaskUserRef | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  dueAt?: string | null;
  contactId?: string;
  assignedToId?: string;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface ListTasksParams {
  status?: TaskStatus;
  category?: string;
  assignedToId?: string;
  overdue?: boolean;
}

export const tasksService = {
  async list(params?: ListTasksParams): Promise<Task[]> {
    const { data } = await api.get('/tasks', {
      params: params?.overdue
        ? { ...params, overdue: 'true' }
        : params,
    });
    return data.data ?? data ?? [];
  },

  async create(payload: CreateTaskPayload): Promise<Task> {
    const { data } = await api.post('/tasks', payload);
    return data.data ?? data;
  },

  async update(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const { data } = await api.patch(`/tasks/${id}`, payload);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },
};

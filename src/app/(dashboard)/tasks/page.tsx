import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { ListTodo } from 'lucide-react';

export default function TasksPage() {
  return (
    <PagePlaceholder
      title="Tarefas"
      subtitle="Organize as tarefas do escritório e da equipe."
      icon={<ListTodo className="size-6" />}
    />
  );
}

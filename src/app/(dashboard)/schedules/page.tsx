import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { CalendarClock } from 'lucide-react';

export default function SchedulesPage() {
  return (
    <PagePlaceholder
      title="Agendamentos"
      subtitle="Agende perícias, audiências e compromissos com clientes."
      icon={<CalendarClock className="size-6" />}
    />
  );
}

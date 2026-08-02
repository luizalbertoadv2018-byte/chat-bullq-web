import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { Plug } from 'lucide-react';

export default function ConnectionsPage() {
  return (
    <PagePlaceholder
      title="Conexões"
      subtitle="Gerencie suas conexões com canais de comunicação."
      icon={<Plug className="size-6" />}
    />
  );
}

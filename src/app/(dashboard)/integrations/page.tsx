import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { Blocks } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <PagePlaceholder
      title="Integrações"
      subtitle="Conecte o Chat BullQ a outras ferramentas do escritório."
      icon={<Blocks className="size-6" />}
    />
  );
}

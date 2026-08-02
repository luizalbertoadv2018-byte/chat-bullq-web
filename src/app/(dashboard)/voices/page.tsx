import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { AudioLines } from 'lucide-react';

export default function VoicesPage() {
  return (
    <PagePlaceholder
      title="Vozes"
      subtitle="Configure as vozes usadas nas respostas em áudio dos agentes."
      icon={<AudioLines className="size-6" />}
    />
  );
}

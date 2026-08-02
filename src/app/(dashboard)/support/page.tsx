import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { LifeBuoy } from 'lucide-react';

export default function SupportPage() {
  return (
    <PagePlaceholder
      title="Suporte"
      subtitle="Precisa de ajuda? Fale com o suporte do Chat BullQ."
      icon={<LifeBuoy className="size-6" />}
    />
  );
}

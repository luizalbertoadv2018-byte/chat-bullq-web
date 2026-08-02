import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { BookOpen } from 'lucide-react';

export default function KnowledgePage() {
  return (
    <PagePlaceholder
      title="Base de Conhecimento"
      subtitle="Documentos e conteúdos que alimentam os agentes de IA."
      icon={<BookOpen className="size-6" />}
    />
  );
}

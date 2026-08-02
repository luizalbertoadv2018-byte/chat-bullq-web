import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { GraduationCap } from 'lucide-react';

export default function AcademyPage() {
  return (
    <PagePlaceholder
      title="Academy"
      subtitle="Tutoriais e treinamentos para tirar o máximo da plataforma."
      icon={<GraduationCap className="size-6" />}
    />
  );
}

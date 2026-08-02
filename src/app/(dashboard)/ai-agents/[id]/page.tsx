'use client';

import { use } from 'react';
import { AgentEditor } from '@/features/ai-agents/components/agent-editor';

export default function AgentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AgentEditor agentId={id} />;
}

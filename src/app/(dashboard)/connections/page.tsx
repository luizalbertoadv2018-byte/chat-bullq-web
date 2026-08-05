'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { ChannelsList } from '@/features/channels/components/channels-list';
import { EvolutionConnectDialog } from '@/features/channels/components/evolution-connect-dialog';

// Conexões (top-level, estilo LiderHub) — mesma gestão de canais das Configurações.
export default function ConnectionsPage() {
  const [evoOpen, setEvoOpen] = useState(false);
  const queryClient = useQueryClient();

  return (
    <div className="relative h-full">
      <ChannelsList />

      {/* Ação rápida: conectar WhatsApp via Evolution API (não oficial). */}
      <button
        onClick={() => setEvoOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-700"
      >
        <Smartphone className="h-4 w-4" />
        Conectar WhatsApp (Evolution)
      </button>

      <EvolutionConnectDialog
        open={evoOpen}
        onClose={() => setEvoOpen(false)}
        onConnected={() => {
          queryClient.invalidateQueries({ queryKey: ['channels'] });
        }}
      />
    </div>
  );
}

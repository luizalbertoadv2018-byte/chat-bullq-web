'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Activity, CheckCircle2, XCircle, Target, Clock } from 'lucide-react';
import { dashboardService } from '../services/dashboard.service';
import { useOrgId } from '@/hooks/use-org-query-key';

function stageColor(type: string, i: number, total: number) {
  if (type === 'WON') return '#22c55e';
  if (type === 'LOST') return '#ef4444';
  // NORMAL: gradiente de azul → índigo conforme avança no funil
  const shades = ['#93c5fd', '#60a5fa', '#3b82f6', '#6366f1', '#818cf8', '#a78bfa'];
  return shades[Math.min(i, shades.length - 1)];
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}

export function BusinessFunnel() {
  const orgId = useOrgId();
  const { data, isLoading } = useQuery({
    queryKey: ['pipeline-metrics', orgId],
    queryFn: () => dashboardService.getPipelineMetrics(30),
  });

  if (isLoading) {
    return (
      <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
    );
  }
  if (!data) return null;

  const o = data.overview;
  const pipelinesComCards = data.pipelines.filter((p) => p.total > 0);

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Funil de negócio (pipelines)
      </h2>

      {/* KPIs */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Total de leads" value={o.totalLeads} icon={Users} accent="#3b82f6" />
        <Kpi label="Ativos" value={o.ativos} icon={Activity} accent="#6366f1" />
        <Kpi label="Ganhos" value={o.ganhos} icon={CheckCircle2} accent="#22c55e" />
        <Kpi label="Perdidos" value={o.perdidos} icon={XCircle} accent="#ef4444" />
        <Kpi
          label="Conversão"
          value={o.conversao === null ? '—' : `${o.conversao}%`}
          icon={Target}
          accent="#f59e0b"
        />
      </div>

      {/* Leads novos por dia */}
      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Leads novos por dia
          </h3>
          <span className="text-xs text-zinc-400">{o.leadsNoPeriodo} nos últimos {o.periodoDias} dias</span>
        </div>
        <div className="mt-3 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.leadsPorDia}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                tickFormatter={(d: string) => d.slice(8, 10) + '/' + d.slice(5, 7)}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <Tooltip
                labelFormatter={(d: any) =>
                  typeof d === 'string' ? d.split('-').reverse().join('/') : d
                }
                formatter={(v: any) => [v, 'leads']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funil por pipeline */}
      <div className="mt-4 space-y-3">
        {pipelinesComCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            Nenhum lead nos funis ainda. Assim que os leads entrarem, o funil aparece aqui.
          </div>
        ) : (
          pipelinesComCards.map((p) => {
            const maxStage = Math.max(1, ...p.stages.map((s) => s.count));
            return (
              <div
                key={p.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{p.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {p.total}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Target className="h-3.5 w-3.5" /> {p.conversao === null ? '—' : `${p.conversao}%`} conversão
                    </span>
                    {p.avgDaysToClose !== null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {p.avgDaysToClose}d p/ fechar
                      </span>
                    )}
                  </div>
                </div>
                {/* barras por estágio */}
                <div className="mt-3 space-y-1.5">
                  {p.stages.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 truncate text-[11px] text-zinc-500" title={s.name}>
                        {s.name}
                      </span>
                      <div className="relative h-4 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${(s.count / maxStage) * 100}%`,
                            backgroundColor: stageColor(s.type, i, p.stages.length),
                            minWidth: s.count > 0 ? '6px' : '0',
                          }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-zinc-600 dark:text-zinc-300">
                        {s.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

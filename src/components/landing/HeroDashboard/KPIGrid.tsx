import type { KpiMetric } from './dashboard.data';
import { KPICard } from './KPICard';

type KPIGridProps = {
  metrics: KpiMetric[];
};

export function KPIGrid({ metrics }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-4 lg:grid-cols-4 lg:gap-4">
      {metrics.map((metric, index) => (
        <KPICard key={metric.id} metric={metric} index={index} />
      ))}
    </div>
  );
}

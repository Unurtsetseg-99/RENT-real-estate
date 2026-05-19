import type { MetricCardProps } from "@/types";

export default function MetricCard({ label, value, trend, tone = "default" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <p>{label}</p>
      <h3>{value}</h3>
      <span>{trend}</span>
    </article>
  );
}

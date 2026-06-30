import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "neutral";
  trend?: "up" | "down";
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "neutral", trend }: MetricCardProps) {
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__icon" aria-hidden="true">
        <Icon size={17} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? (
          <small>
            {trend ? <TrendIcon size={14} aria-hidden="true" /> : null}
            {detail}
          </small>
        ) : null}
      </div>
    </article>
  );
}

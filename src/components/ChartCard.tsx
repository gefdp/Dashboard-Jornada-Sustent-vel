import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  option: EChartsOption;
  className?: string;
  height?: number;
  actions?: ReactNode;
  overlay?: ReactNode;
  onEvents?: Record<string, (params: any) => void>;
}

export function ChartCard({ title, subtitle, option, className = "", height = 300, actions, overlay, onEvents }: ChartCardProps) {
  return (
    <section className={`chart-card ${className}`} style={{ position: "relative" }}>
      <header className="chart-card__header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="chart-card__actions">{actions}</div> : null}
      </header>
      <ReactECharts
        option={{ ...option, backgroundColor: "transparent" }}
        notMerge
        lazyUpdate
        onEvents={onEvents}
        opts={{ renderer: "canvas" }}
        style={{ height, width: "100%" }}
      />
      {overlay}
    </section>
  );
}

import type { EChartsOption } from "echarts";
import { BadgeCheck, Building2, ChevronLeft, ChevronRight, Download, Search, School, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FilterBar } from "../components/FilterBar";
import { MetricCard } from "../components/MetricCard";
import { PageTitle } from "../components/PageTitle";
import type { EfficiencySchool, SchoolStatus } from "../types";
import { ct } from "../utils/chartTheme";
import {
  ALL_VALUE,
  GRE_OPTIONS,
  filterByOption,
  formatNumber,
  formatPercentValue,
  greSort,
  normalizeSearchText,
  percent,
  statusLabel,
  uniqueOptions,
} from "../utils/data";
import { ChartCard } from "../components/ChartCard";

interface EficienciaPageProps {
  schools: EfficiencySchool[];
  darkMode: boolean;
}

const clearFilters = {
  gre: ALL_VALUE,
  status: ALL_VALUE,
};

const statusOptions: SchoolStatus[] = ["Credenciada", "Inscrita e ausente", "Nao inscrita"];

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function exportSchoolsCsv(rows: EfficiencySchool[]) {
  const header = ["GRE", "INEP", "Escola", "Município", "Polo", "Status"];
  const lines = rows.map((row) =>
    [
      row.gre,
      row.inep,
      row.escola,
      row.municipio,
      row.polo,
      statusLabel(row.status),
    ]
      .map(csvCell)
      .join(";"),
  );
  const csv = `\uFEFF${[header.map(csvCell).join(";"), ...lines].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "eficiencia_gestao_escolas.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function EficienciaPage({ schools, darkMode }: EficienciaPageProps) {
  const [filters, setFilters] = useState(clearFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const query = normalizeSearchText(search);
    return schools.filter((school) => {
      const statusMatch = filters.status === ALL_VALUE || school.status === filters.status;
      const queryMatch =
        !query ||
        [school.gre, school.inep, school.escola, school.municipio, school.polo, statusLabel(school.status)]
          .map(normalizeSearchText)
          .some((value) => value.includes(query));
      return filterByOption(school.gre, filters.gre) && statusMatch && queryMatch;
    });
  }, [schools, filters, search]);

  useEffect(() => {
    setPage(1);
  }, [filters, search, pageSize]);

  const metrics = useMemo(() => {
    const total = filtered.length;
    const credenciadas = filtered.filter((school) => school.status === "Credenciada").length;
    const ausentes = filtered.filter((school) => school.status === "Inscrita e ausente").length;
    const naoInscritas = filtered.filter((school) => school.status === "Nao inscrita").length;
    return {
      total,
      credenciadas,
      ausentes,
      naoInscritas,
      eficiencia: percent(credenciadas, total),
    };
  }, [filtered]);

  const grePerformance = useMemo(() => {
    return GRE_OPTIONS.map((gre) => {
      const rows = filtered.filter((school) => school.gre === gre);
      const total = rows.length;
      const credenciadas = rows.filter((school) => school.status === "Credenciada").length;
      const ausentes = rows.filter((school) => school.status === "Inscrita e ausente").length;
      const naoInscritas = rows.filter((school) => school.status === "Nao inscrita").length;
      return {
        gre,
        total,
        credenciadas,
        ausentes,
        naoInscritas,
        eficiencia: percent(credenciadas, total),
      };
    }).filter((item) => item.total > 0);
  }, [filtered]);

  const participationOption = useMemo<EChartsOption>(() => {
    const c = ct(darkMode);
    const rows = [...grePerformance].sort((a, b) => greSort(a.gre, b.gre));
    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#061f1c",
        borderColor: "#1fcab8",
        borderWidth: 1,
        textStyle: { color: "#c8fff4", fontSize: 12 },
        extraCssText: "border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.35);",
      },
      legend: {
        top: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: c.legendText, fontSize: 11 },
      },
      grid: { left: 44, right: 50, top: 46, bottom: 44 },
      xAxis: {
        type: "category",
        data: rows.map((item) => item.gre),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel, fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          splitLine: { lineStyle: { color: c.splitLine, type: "dashed" } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: c.axisLabel },
        },
        {
          type: "value",
          min: 0,
          max: 100,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { formatter: "{value}%", color: "#00d4ff" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Credenciadas",
          type: "bar",
          stack: "total",
          data: rows.map((item) => item.credenciadas),
          itemStyle: {
            color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#1fcab8" }, { offset: 1, color: "#0b7e6e" }] },
          },
          label: {
            show: true,
            position: "inside",
            formatter: (params: { dataIndex: number }) => {
              const row = rows[params.dataIndex];
              return row && row.total > 0 ? `${row.eficiencia.toFixed(1)}%` : "";
            },
            color: "#fff",
            fontSize: 11,
            fontWeight: "bold",
            textShadowBlur: 4,
            textShadowColor: "rgba(0,0,0,0.6)",
          },
          emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(31,202,184,0.5)" } },
        },
        {
          name: "Ausentes",
          type: "bar",
          stack: "total",
          data: rows.map((item) => item.ausentes),
          itemStyle: {
            color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#f3d33b" }, { offset: 1, color: "#e8a324" }] },
          },
          emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(243,211,59,0.45)" } },
        },
        {
          name: "Não inscritas",
          type: "bar",
          stack: "total",
          data: rows.map((item) => item.naoInscritas),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#8aaea9" }, { offset: 1, color: "#607a73" }] },
          },
          emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(96,122,115,0.45)" } },
        },
        {
          name: "Índice de eficiência",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 8,
          data: rows.map((item) => Number(item.eficiencia.toFixed(1))),
          lineStyle: { color: "#00d4ff", width: 2.5, shadowBlur: 10, shadowColor: "rgba(0,212,255,0.5)" },
          itemStyle: { color: "#00d4ff", borderWidth: 2, borderColor: "#fff" },
          emphasis: { itemStyle: { shadowBlur: 16, shadowColor: "rgba(0,212,255,0.7)" } },
        },
      ],
    };
  }, [grePerformance, darkMode]);

  const filterConfigs = useMemo(
    () => [
      { key: "gre", label: "GRE", value: filters.gre, options: uniqueOptions(schools.map((school) => school.gre), true) },
      {
        key: "status",
        label: "Status",
        value: filters.status,
        options: statusOptions.map((status) => ({ value: status, label: statusLabel(status) })),
      },
    ],
    [schools, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="page-stack">
      <div className="page-header">
        <PageTitle
          title="Eficiência da Gestão"
          description="Cruzamento das escolas com o credenciamento pelo INEP para classificar presença, inscrição e lacunas por GRE."
        />
        <FilterBar
          inline
          filters={filterConfigs}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onClear={() => setFilters(clearFilters)}
        />
      </div>

      <section className="metric-grid metric-grid--five">
        <MetricCard label="Total de escolas" value={formatNumber(metrics.total)} detail="base IEG filtrada" icon={School} tone="primary" />
        <MetricCard label="Credenciadas" value={formatNumber(metrics.credenciadas)} detail={formatPercentValue(metrics.eficiencia)} icon={BadgeCheck} tone="success" />
        <MetricCard label="Ausentes" value={formatNumber(metrics.ausentes)} detail={formatPercentValue(percent(metrics.ausentes, metrics.total))} icon={UserX} tone="warning" />
        <MetricCard label="Não inscritas" value={formatNumber(metrics.naoInscritas)} detail={formatPercentValue(percent(metrics.naoInscritas, metrics.total))} icon={Building2} tone="neutral" />
        <MetricCard label="Índice de eficiência" value={formatPercentValue(metrics.eficiencia)} detail="credenciadas sobre total" icon={BadgeCheck} tone="success" trend="up" />
      </section>

      <ChartCard
        title="Participação por GRE"
        subtitle="Status das escolas e índice de eficiência"
        option={participationOption}
        className="chart-card--wide"
        height={340}
      />

      <section className="table-card">
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar escola, INEP, município ou status"
            />
          </label>
          <div className="table-actions">
            <label className="field field--compact">
              <span>Linhas</span>
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button className="icon-button icon-button--text" type="button" onClick={() => exportSchoolsCsv(filtered)}>
              <Download size={17} aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>GRE</th>
                <th>INEP</th>
                <th>Escola</th>
                <th>Município</th>
                <th>Polo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((school) => (
                <tr key={school.inep}>
                  <td>{school.gre ?? "-"}</td>
                  <td>{school.inep}</td>
                  <td>{school.escola ?? "-"}</td>
                  <td>{school.municipio ?? "-"}</td>
                  <td>{school.polo ?? "-"}</td>
                  <td>
                    <span className={`status-pill status-pill--${school.status.replaceAll(" ", "-").toLocaleLowerCase("pt-BR")}`}>
                      {statusLabel(school.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="pagination">
          <span>
            {formatNumber(filtered.length)} escolas · página {currentPage} de {totalPages}
          </span>
          <div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              title="Página anterior"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              title="Próxima página"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

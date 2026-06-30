import type { EChartsOption } from "echarts";
import { MessageSquareText, Percent, Star, TrendingUp, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { ChartCard } from "../components/ChartCard";
import { FilterBar } from "../components/FilterBar";
import { MetricCard } from "../components/MetricCard";
import { PageTitle } from "../components/PageTitle";
import type { EvaluationRecord, RegionByMunicipality } from "../types";
import { ct } from "../utils/chartTheme";
import {
  ALL_VALUE,
  GRE_OPTIONS,
  SCORE_LABELS,
  averageBy,
  filterByOption,
  formatDecimal,
  formatNumber,
  formatPercentValue,
  mean,
  normalizeSearchText,
  percent,
  uniqueOptions,
} from "../utils/data";

interface AvaliacaoPageProps {
  evaluations: EvaluationRecord[];
  regions: RegionByMunicipality;
  darkMode: boolean;
}

const clearFilters = {
  polo: ALL_VALUE,
  gre: ALL_VALUE,
  funcao: ALL_VALUE,
};

type FunctionRole = "diretor" | "coordenador" | "professor";
type CommentsView = "positivos" | "melhorias";

const pedagogicalSet = new Set([
  "q1_relevancia_conteudos",
  "q3_contribuicao_pedagogica",
  "q5_avaliacao_formadores",
  "q6_metodologias_utilizadas",
]);

const logisticSet = new Set([
  "q2_carga_horaria",
  "q4_recursos_materiais",
  "q7_alimentacao",
  "q8_organizacao_evento",
  "q10_programacao",
]);

const positiveWords = [
  "excelente",
  "otim",
  "maravilh",
  "produtiv",
  "enriquec",
  "parabens",
  "impecavel",
  "satisfator",
  "proveitos",
];

const positiveTopics = [
  { name: "Elogios gerais", terms: positiveWords },
  { name: "Conteúdos", terms: ["conteudo", "tema", "assunto", "relevancia"] },
  { name: "Formadores", terms: ["formador", "palestrante", "professor"] },
  { name: "Metodologias", terms: ["metodologia", "dinamica", "pratica", "atividade"] },
  { name: "Aprendizado", terms: ["aprendi", "aprendiz", "conhecimento", "contribuicao"] },
  { name: "Organização", terms: ["organizacao", "logistica", "acolhimento"] },
];

const improvementTopics = [
  { name: "Alimentação", terms: ["alimentacao", "almoco", "lanche", "comida"] },
  { name: "Horário", terms: ["horario", "atras", "tempo", "pontual"] },
  { name: "Programação", terms: ["programacao", "carga horaria", "cronograma"] },
  { name: "Organização", terms: ["organizacao", "logistica", "credenciamento"] },
  { name: "Recursos", terms: ["material", "recurso", "som", "microfone", "internet"] },
  { name: "Espaço", terms: ["espaco", "ambiente", "climatizacao", "sala"] },
];

const regionOrder = ["Mata/Litoral", "Agreste Paraibano", "Borborema", "Sertão Paraibano"];
const regionColors = ["#1fcab8", "#2fbf67", "#f3d33b", "#0f7c6a"];

const regionGrads: Record<string, [string, string]> = {
  "Mata/Litoral": ["#0b8c7e", "#1fcab8"],
  "Agreste Paraibano": ["#1d9c4d", "#2fbf67"],
  "Borborema": ["#c9ae1e", "#f3d33b"],
  "Sertão Paraibano": ["#0a5e52", "#0f7c6a"],
};

const darkTip = {
  backgroundColor: "#061f1c",
  borderColor: "#1fcab8",
  borderWidth: 1,
  textStyle: { color: "#c8fff4", fontSize: 12 },
  extraCssText: "border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.35);",
};

const tealGrad = {
  type: "linear" as const,
  x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [{ offset: 0, color: "#1fcab8" }, { offset: 1, color: "#0b7e6e" }],
};

const tealGradH = {
  type: "linear" as const,
  x: 0, y: 0, x2: 1, y2: 0,
  colorStops: [{ offset: 0, color: "#0b7e6e" }, { offset: 1, color: "#1fcab8" }],
};

const amberGradH = {
  type: "linear" as const,
  x: 0, y: 0, x2: 1, y2: 0,
  colorStops: [{ offset: 0, color: "#c8870e" }, { offset: 1, color: "#f3d33b" }],
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}


export function AvaliacaoPage({ evaluations, regions, darkMode }: AvaliacaoPageProps) {
  const [filters, setFilters] = useState(clearFilters);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [commentsView, setCommentsView] = useState<CommentsView>("positivos");

  const filtered = useMemo(() => {
    return evaluations.filter(
      (item) =>
        filterByOption(item.polo, filters.polo) &&
        filterByOption(item.gre, filters.gre) &&
        filterByOption(item.funcao, filters.funcao),
    );
  }, [evaluations, filters]);

  const metrics = useMemo(() => {
    const respostas = filtered.length;
    const mediaPedagogica = mean(filtered.map((item) => item.mediaPedagogica));
    const mediaLogistica = mean(filtered.map((item) => item.mediaLogistica));
    const mediaGeral = mean(filtered.map((item) => item.mediaGeral));
    const satisfacaoGeral = mean(filtered.map((item) => item.scores.q9_formacao_geral));
    const positivas = filtered.filter((item) => item.positiva).length;
    return { respostas, mediaPedagogica, mediaLogistica, mediaGeral, satisfacaoGeral, positivas };
  }, [filtered]);

  const averageGreOption = useMemo<EChartsOption>(() => {
    const c = ct(darkMode);
    const averages = new Map(
      averageBy(filtered, (item) => item.gre, (item) => item.mediaGeral).map((item) => [item.name, item]),
    );
    const rows = GRE_OPTIONS.map((gre) => ({ name: gre, value: averages.get(gre)?.value ?? 0 }));
    const maxVal = Math.max(...rows.map((r) => r.value), 0.01);

    return {
      tooltip: {
        trigger: "axis",
        ...darkTip,
        valueFormatter: (value: any) => `${Number(value).toFixed(1)}/10`,
      },
      grid: { left: 44, right: 18, top: 36, bottom: 44 },
      xAxis: {
        type: "category",
        data: rows.map((item) => item.name.slice(0, 2)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 10,
        splitLine: { lineStyle: { color: c.splitLine, type: "dashed" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel },
      },
      series: [
        {
          name: "Média geral",
          type: "bar",
          data: rows.map((item) => ({
            value: Number(item.value.toFixed(1)),
            itemStyle: {
              borderRadius: [6, 6, 0, 0],
              color: item.value === maxVal
                ? { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#25ecd4" }, { offset: 1, color: "#0ea68f" }] }
                : tealGrad,
              shadowBlur: item.value === maxVal ? 14 : 0,
              shadowColor: "rgba(31,202,184,0.55)",
            },
          })),
          barMaxWidth: 32,
          emphasis: {
            itemStyle: { shadowBlur: 18, shadowColor: "rgba(31,202,184,0.55)" },
          },
          label: {
            show: true,
            position: "top",
            color: "#1fcab8",
            fontSize: 10,
            fontWeight: "bold",
            formatter: (params: any) => (Number(params.value) > 0 ? Number(params.value).toFixed(1) : "-"),
          },
        },
      ],
    };
  }, [filtered, darkMode]);

  const questionOption = useMemo<EChartsOption>(() => {
    const c = ct(darkMode);
    const means = new Map(
      Object.keys(SCORE_LABELS).map((key) => [key, mean(filtered.map((item) => item.scores[key])) ?? 0]),
    );
    const pedagogicalRows = Object.entries(SCORE_LABELS)
      .filter(([key]) => pedagogicalSet.has(key))
      .map(([key, label]) => ({ label, value: Number((means.get(key) ?? 0).toFixed(1)) }))
      .reverse();
    const logisticRows = Object.entries(SCORE_LABELS)
      .filter(([key]) => logisticSet.has(key))
      .map(([key, label]) => ({ label, value: Number((means.get(key) ?? 0).toFixed(1)) }))
      .reverse();

    return {
      tooltip: {
        trigger: "axis",
        ...darkTip,
        valueFormatter: (value: any) => `${Number(value).toFixed(1)}/10`,
      },
      title: [
        { text: "Pedagógico", left: "18%", top: 0, textStyle: { color: "#1fcab8", fontSize: 13, fontWeight: "bold" } },
        { text: "Logístico", left: "68%", top: 0, textStyle: { color: "#e8a324", fontSize: 13, fontWeight: "bold" } },
      ],
      grid: [
        { left: 118, width: "27%", top: 34, bottom: 24 },
        { left: "59%", width: "27%", top: 34, bottom: 24 },
      ],
      xAxis: [
        {
          type: "value",
          min: 0,
          max: 12,
          gridIndex: 0,
          splitLine: { lineStyle: { color: c.splitLine, type: "dashed" } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: c.axisLabel },
        },
        {
          type: "value",
          min: 0,
          max: 12,
          gridIndex: 1,
          splitLine: { lineStyle: { color: c.splitLine, type: "dashed" } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: c.axisLabel },
        },
      ],
      yAxis: [
        {
          type: "category",
          gridIndex: 0,
          data: pedagogicalRows.map((item) => item.label),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: c.axisLabel, width: 100, overflow: "truncate" },
        },
        {
          type: "category",
          gridIndex: 1,
          data: logisticRows.map((item) => item.label),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: c.axisLabel, width: 100, overflow: "truncate" },
        },
      ],
      series: [
        {
          name: "Pedagógicas",
          type: "bar",
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: pedagogicalRows.map((item) => item.value),
          barMaxWidth: 14,
          itemStyle: { borderRadius: [0, 6, 6, 0], color: tealGradH },
          emphasis: { itemStyle: { shadowBlur: 14, shadowColor: "rgba(31,202,184,0.5)" } },
          label: {
            show: true,
            position: "right",
            distance: 5,
            color: darkMode ? "#c8fff4" : "#063d36",
            backgroundColor: darkMode ? "rgba(31,202,184,0.18)" : "#dff9f4",
            borderRadius: 5,
            padding: [2, 5],
            fontSize: 10,
            fontWeight: "bold",
          },
        },
        {
          name: "Logísticas",
          type: "bar",
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: logisticRows.map((item) => item.value),
          barMaxWidth: 14,
          itemStyle: { borderRadius: [0, 6, 6, 0], color: amberGradH },
          emphasis: { itemStyle: { shadowBlur: 14, shadowColor: "rgba(243,211,59,0.5)" } },
          label: {
            show: true,
            position: "right",
            distance: 5,
            color: darkMode ? "#fff3c4" : "#5a3300",
            backgroundColor: darkMode ? "rgba(243,170,50,0.2)" : "#fff0c7",
            borderRadius: 5,
            padding: [2, 5],
            fontSize: 10,
            fontWeight: "bold",
          },
        },
      ],
    };
  }, [filtered, darkMode]);

  const functionScores = useMemo(() => {
    const roles: Array<{ key: FunctionRole; label: string; shortLabel: string }> = [
      { key: "diretor", label: "Média por diretor(a)", shortLabel: "Diretor(a)" },
      { key: "coordenador", label: "Média por coordenador(a)", shortLabel: "Coordenador(a)" },
      { key: "professor", label: "Média por professor(a)", shortLabel: "Professor(a)" },
    ];

    return roles.map((role) => {
      const rows = filtered.filter((item) => normalizeSearchText(item.funcao).includes(role.key));
      return {
        ...role,
        count: rows.length,
        score: mean(rows.map((item) => item.mediaGeral)),
      };
    });
  }, [filtered]);

  const poloParticipationOption = useMemo<EChartsOption>(() => {
    const polos = uniqueOptions(filtered.map((item) => item.polo)).map((option) => option.value);
    const responses = polos.map((polo) => filtered.filter((item) => item.polo === polo).length);
    const averages = polos.map((polo) => {
      const rows = filtered.filter((item) => item.polo === polo);
      return Number((mean(rows.map((item) => item.mediaGeral)) ?? 0).toFixed(1));
    });

    const c = ct(darkMode);
    return {
      tooltip: { trigger: "axis", ...darkTip },
      legend: {
        top: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: c.legendText, fontSize: 11 },
      },
      grid: { left: 44, right: 44, top: 46, bottom: 42 },
      xAxis: {
        type: "category",
        data: polos,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel, fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          name: "Respostas",
          splitLine: { lineStyle: { color: c.splitLine, type: "dashed" } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: c.axisLabel },
          nameTextStyle: { color: c.axisLabel },
        },
        {
          type: "value",
          name: "Média",
          min: 0,
          max: 10,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: "#e8a324" },
          nameTextStyle: { color: "#e8a324" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Respostas",
          type: "bar",
          data: responses,
          barMaxWidth: 34,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: tealGrad },
          emphasis: { itemStyle: { shadowBlur: 14, shadowColor: "rgba(31,202,184,0.5)" } },
          label: { show: true, position: "top", color: "#1fcab8", fontSize: 10, fontWeight: "bold" },
        },
        {
          name: "Média",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 9,
          data: averages,
          lineStyle: { color: "#f3aa32", width: 2.5, shadowBlur: 8, shadowColor: "rgba(243,170,50,0.45)" },
          itemStyle: { color: "#f3aa32", borderWidth: 2, borderColor: "#fff" },
          emphasis: { itemStyle: { shadowBlur: 14, shadowColor: "rgba(243,170,50,0.55)" } },
          label: {
            show: true,
            position: "top",
            color: "#b87d10",
            fontSize: 10,
            fontWeight: "bold",
            formatter: (params: any) => `${Number(params.value).toFixed(1)}`,
          },
        },
      ],
    };
  }, [filtered, darkMode]);

  const regionalScoreOption = useMemo<EChartsOption>(() => {
    const normalizedRegions = new Map(
      Object.entries(regions).map(([city, region]) => [normalizeSearchText(city), region]),
    );
    const regionStats = new Map<string, { total: number; count: number }>();

    for (const item of filtered) {
      if (!item.municipio || item.mediaGeral === null) continue;
      const region = normalizedRegions.get(normalizeSearchText(item.municipio));
      if (!region) continue;
      const current = regionStats.get(region) ?? { total: 0, count: 0 };
      current.total += item.mediaGeral;
      current.count += 1;
      regionStats.set(region, current);
    }

    const regionAverage = (region: string) => {
      const stats = regionStats.get(region);
      if (!stats?.count) return 0;
      return Number((stats.total / stats.count).toFixed(1));
    };

    const c = ct(darkMode);
    const data = regionOrder
      .map((region, index) => {
        const stats = regionStats.get(region);
        const isDimmed = Boolean(selectedRegion && region !== selectedRegion);
        const grad = regionGrads[region] ?? ["#1fcab8", "#0b7e6e"];
        return {
          name: region,
          value: regionAverage(region),
          average: regionAverage(region),
          region,
          responses: stats?.count ?? 0,
          itemStyle: isDimmed
            ? { borderRadius: [0, 6, 6, 0], color: c.dimmedBar }
            : {
                borderRadius: [0, 6, 6, 0],
                color: { type: "linear" as const, x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: grad[0] }, { offset: 1, color: grad[1] }] },
                shadowBlur: selectedRegion === region ? 14 : 0,
                shadowColor: `${regionColors[index]}88`,
              },
        };
      })
      .reverse();

    return {
      tooltip: {
        trigger: "axis",
        ...darkTip,
        valueFormatter: (value: any) => `${Number(value).toFixed(1)}/10`,
      },
      grid: { left: 112, right: 18, top: 20, bottom: 28 },
      xAxis: {
        type: "value",
        min: 0,
        max: 10,
        splitLine: { lineStyle: { color: c.splitLine, type: "dashed" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel },
      },
      yAxis: {
        type: "category",
        data: data.map((item) => item.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel, width: 96, overflow: "truncate" },
      },
      series: [
        {
          name: "Média",
          type: "bar",
          barMaxWidth: 18,
          emphasis: { itemStyle: { shadowBlur: 14, shadowColor: "rgba(31,202,184,0.5)" } },
          label: {
            show: true,
            position: "right",
            color: c.legendText,
            fontSize: 10,
            fontWeight: "bold",
            formatter: (params: any) => (Number(params.value) > 0 ? Number(params.value).toFixed(1) : "-"),
          },
          data,
        },
      ],
    };
  }, [filtered, regions, selectedRegion, darkMode]);

  const commentsOption = useMemo<EChartsOption>(() => {
    const c = ct(darkMode);
    const comments = filtered.map((item) => normalizeSearchText(item.comentario)).filter(Boolean);
    const isPositive = commentsView === "positivos";
    const topics = isPositive ? positiveTopics : improvementTopics;
    const rows = topics
      .map((topic) => {
        const value = comments.filter((comment) => {
          if (topic.name === "Elogios gerais") return includesAny(comment, positiveWords);
          return includesAny(comment, topic.terms);
        }).length;
        return { name: topic.name, value };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => a.value - b.value);

    const fallbackRows = [{ name: isPositive ? "Sem elogios categorizados" : "Sem pontos categorizados", value: 0 }];
    const chartRows = rows.length ? rows : fallbackRows;
    const colorStart = isPositive ? "#0b7e6e" : "#c8870e";
    const colorEnd = isPositive ? "#1fcab8" : "#f3aa32";
    const shadowColor = isPositive ? "rgba(31,202,184,0.45)" : "rgba(243,170,50,0.42)";

    return {
      tooltip: {
        trigger: "axis",
        ...darkTip,
        formatter: (params: any) => {
          const p = params[0];
          const label = isPositive ? "menções positivas" : "menções a melhorar";
          return `<b style="color:${colorEnd}">${p.axisValue}</b><br/>${label}: <b>${p.value}</b>`;
        },
      },
      grid: { left: 116, right: 28, top: 18, bottom: 30 },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { color: c.splitLine, type: "dashed" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel },
      },
      yAxis: {
        type: "category",
        data: chartRows.map((item) => item.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel, width: 100, overflow: "truncate" },
      },
      series: [
        {
          name: isPositive ? "Pontos positivos" : "Pontos a melhorar",
          type: "bar",
          data: chartRows.map((item) => ({
            value: item.value,
            itemStyle: {
              borderRadius: [0, 6, 6, 0],
              color: {
                type: "linear" as const,
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [{ offset: 0, color: colorStart }, { offset: 1, color: colorEnd }],
              },
            },
          })),
          barMaxWidth: 18,
          emphasis: { itemStyle: { shadowBlur: 12, shadowColor } },
          label: {
            show: true,
            position: "right",
            color: colorEnd,
            fontSize: 10,
            fontWeight: "bold",
          },
        },
      ],
    };
  }, [filtered, commentsView, darkMode]);

  const filterConfigs = useMemo(
    () => [
      { key: "polo", label: "Polo", value: filters.polo, options: uniqueOptions(evaluations.map((item) => item.polo)) },
      { key: "gre", label: "GRE", value: filters.gre, options: uniqueOptions(evaluations.map((item) => item.gre), true) },
      {
        key: "funcao",
        label: "Função",
        value: filters.funcao,
        options: uniqueOptions(evaluations.map((item) => item.funcao)),
      },
    ],
    [evaluations, filters],
  );

  return (
    <div className="page-stack">
      <div className="page-header">
        <PageTitle
          title="Avaliação"
          description="Leitura das respostas de satisfação com médias pedagógicas, logísticas e resultado geral por território e função."
        />
        <FilterBar
          inline
          filters={filterConfigs}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onClear={() => setFilters(clearFilters)}
        />
      </div>

      <section className="metric-grid metric-grid--five">
        <MetricCard label="Respostas" value={formatNumber(metrics.respostas)} detail="avaliações filtradas" icon={MessageSquareText} tone="primary" />
        <MetricCard label="Média pedagógica" value={formatDecimal(metrics.mediaPedagogica)} detail="escala 0 a 10" icon={Star} tone="success" />
        <MetricCard label="Média logística" value={formatDecimal(metrics.mediaLogistica)} detail="escala 0 a 10" icon={TrendingUp} tone="warning" />
        <MetricCard label="Média geral" value={formatDecimal(metrics.mediaGeral)} detail="percepção consolidada" icon={UsersRound} tone="neutral" />
        <MetricCard
          label="Avaliações positivas"
          value={formatPercentValue(percent(metrics.positivas, metrics.respostas))}
          detail={`${formatNumber(metrics.positivas)} respostas`}
          icon={Percent}
          tone="success"
        />
      </section>

      <section className="chart-grid">
        <ChartCard title="Média por GRE" subtitle="Resultado geral em base 10" option={averageGreOption} />
        <ChartCard
          title="Notas pedagógicas e logísticas"
          subtitle="Pedagógico e logístico em barras"
          option={questionOption}
          height={340}
        />
      </section>

      <section className="compact-four-grid">
        <section className="chart-card function-score-card">
          <header className="chart-card__header">
            <div>
              <h3>Resultado por função</h3>
              <p>Média geral por perfil respondente</p>
            </div>
          </header>
          <div className="fsl-chart">
            <div className="fsl-header-row">
              <div className="fsl-label-col" />
              <div className="fsl-track-col">
                <div className="fsl-scale">
                  {[0, 2, 4, 6, 8, 10].map((v) => (
                    <span key={v}>{v}</span>
                  ))}
                </div>
              </div>
              <div className="fsl-score-col" />
            </div>
            {functionScores.map((role) => (
              <div key={role.key} className={`fsl-row fsl-row--${role.key}`}>
                <div className="fsl-label-col">
                  <UsersRound size={18} className="fsl-icon" aria-hidden="true" />
                  <div className="fsl-meta">
                    <strong>{role.shortLabel}</strong>
                    <small>{formatNumber(role.count)} respostas</small>
                  </div>
                </div>
                <div className="fsl-track-col">
                  {[2, 4, 6, 8].map((v) => (
                    <div key={v} className="fsl-gridline" style={{ left: `${v * 10}%` }} />
                  ))}
                  <div className="fsl-track">
                    <div className="fsl-bar" style={{ width: `${((role.score ?? 0) / 10) * 100}%` }}>
                      <div className="fsl-dot" />
                    </div>
                  </div>
                </div>
                <div className="fsl-score-col">
                  <strong>{role.score !== null ? role.score!.toFixed(1).replace(".", ",") : "–"}</strong>
                  <small>/10</small>
                </div>
              </div>
            ))}
          </div>
        </section>
        <ChartCard
          title={commentsView === "positivos" ? "Pontos positivos" : "Pontos a melhorar"}
          subtitle={commentsView === "positivos" ? "Elogios e temas bem avaliados" : "Temas recorrentes para ajuste"}
          option={commentsOption}
          height={230}
          actions={
            <div className="sentiment-toggle" aria-label="Visão dos comentários">
              {[
                { value: "positivos", label: "Positivos" },
                { value: "melhorias", label: "A melhorar" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={[
                    "sentiment-toggle__button",
                    `sentiment-toggle__button--${item.value}`,
                    commentsView === item.value ? "sentiment-toggle__button--active" : "",
                  ].join(" ")}
                  onClick={() => setCommentsView(item.value as CommentsView)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />
        <ChartCard
          title="Polo de participação"
          subtitle="Respostas e média geral por polo"
          option={poloParticipationOption}
          height={230}
        />
        <ChartCard
          title="Nota por região"
          subtitle="Média por divisão territorial · clique para destacar"
          option={regionalScoreOption}
          height={230}
          onEvents={{
            click: (params: any) => {
              const region = params?.data?.region;
              if (!region || !regionOrder.includes(region)) return;
              setSelectedRegion((current) => (current === region ? null : region));
            },
          }}
        />
      </section>
    </div>
  );
}

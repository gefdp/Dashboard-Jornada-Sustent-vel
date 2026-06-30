import type { EChartsOption } from "echarts";
import { BadgeCheck, BadgeX, Clock3, GraduationCap, Minus, Plus, UserCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ChartCard } from "../components/ChartCard";
import { FilterBar } from "../components/FilterBar";
import { MetricCard } from "../components/MetricCard";
import { PageTitle } from "../components/PageTitle";
import type { CredentialRecord, GeoJsonFeatureCollection, RegionByMunicipality } from "../types";
import { ct } from "../utils/chartTheme";
import {
  ALL_VALUE,
  GRE_OPTIONS,
  buildMunicipalityLookup,
  compactLabel,
  countBy,
  filterByOption,
  formatNumber,
  formatPercentValue,
  normalizeSearchText,
  percent,
  statusLabel,
  topEntries,
  uniqueOptions,
} from "../utils/data";

interface CredenciamentoPageProps {
  credentials: CredentialRecord[];
  geoJson: GeoJsonFeatureCollection;
  regions: RegionByMunicipality;
  darkMode: boolean;
}

const clearFilters = {
  polo: ALL_VALUE,
  gre: ALL_VALUE,
  categoria: ALL_VALUE,
  status: ALL_VALUE,
};

const statusOrder: CredentialRecord["statusCredenciamento"][] = ["Credenciado", "Ausente", "Nao inscrito"];
type EvolutionView = "data" | "horario";
type FunctionView = "geral" | "professor" | "coordenador" | "diretor";

function compactOfferLabel(value: string) {
  return value
    .replace(/^Escola\s+/i, "")
    .replace(/^Cidadã Integral Técnica$/i, "Integral Técnica")
    .replace(/^Cidadã Integral$/i, "Integral");
}

export function CredenciamentoPage({ credentials, geoJson, regions, darkMode }: CredenciamentoPageProps) {
  const [filters, setFilters] = useState(clearFilters);
  const [mapZoom, setMapZoom] = useState(1);
  const [evolutionView, setEvolutionView] = useState<EvolutionView>("data");
  const [functionView, setFunctionView] = useState<FunctionView>("geral");

  const statusOptions = useMemo(() => {
    const credentialStatuses = statusOrder.map((status) => ({
      value: `cred:${status}`,
      label: statusLabel(status),
    }));
    const inscriptionStatuses = uniqueOptions(credentials.map((item) => item.statusInscricao)).map((option) => ({
      value: `inscricao:${option.value}`,
      label: `Inscrição: ${option.label}`,
    }));
    return [...credentialStatuses, ...inscriptionStatuses];
  }, [credentials]);

  const filtered = useMemo(() => {
    return credentials.filter((item) => {
      const statusMatch =
        filters.status === ALL_VALUE ||
        (filters.status.startsWith("cred:") && item.statusCredenciamento === filters.status.replace("cred:", "")) ||
        (filters.status.startsWith("inscricao:") &&
          item.statusInscricao === filters.status.replace("inscricao:", ""));

      return (
        filterByOption(item.polo, filters.polo) &&
        filterByOption(item.gre, filters.gre) &&
        filterByOption(item.categoria, filters.categoria) &&
        statusMatch
      );
    });
  }, [credentials, filters]);

  const metrics = useMemo(() => {
    const publico = filtered.length;
    const inscritos = filtered.filter((item) => item.inscrito).length;
    const credenciados = filtered.filter((item) => item.credenciado).length;
    const naoInscritos = filtered.filter((item) => !item.inscrito).length;
    const ausentes = filtered.filter((item) => item.inscrito && !item.credenciado).length;
    const naoCredenciados = publico - credenciados;
    return { publico, inscritos, naoInscritos, credenciados, ausentes, naoCredenciados };
  }, [filtered]);

  const greRateOption = useMemo<EChartsOption>(() => {
    const c = ct(darkMode);
    const rows = GRE_OPTIONS.map((gre) => {
      const greRows = filtered.filter((item) => item.gre === gre);
      const inscritos = greRows.filter((item) => item.inscrito).length;
      const credenciados = greRows.filter((item) => item.credenciado).length;
      return { gre, inscritos, credenciados, taxa: percent(credenciados, inscritos) };
    });

    const values = rows.map((item) => Number(item.taxa.toFixed(1)));

    // Color tiers: amber → yellow → lime → teal based on rate
    function barGradient(v: number): [string, string] {
      if (v >= 95) return ["#0a7260", "#1fcab8"];  // teal   — top
      if (v >= 85) return ["#0d8a50", "#2fbf67"];  // green  — good
      if (v >= 75) return ["#a87010", "#f3d33b"];  // yellow — fair
      return ["#a84810", "#f3aa32"];               // amber  — low
    }

    function shadowFor(v: number): string {
      if (v >= 95) return "rgba(31,202,184,0.50)";
      if (v >= 85) return "rgba(47,191,103,0.45)";
      if (v >= 75) return "rgba(243,211,59,0.45)";
      return "rgba(243,170,50,0.50)";
    }

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#061f1c",
        borderColor: "#1fcab8",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#c8fff4", fontSize: 12.5 },
        extraCssText: "border-radius:8px;box-shadow:0 8px 24px rgba(6,61,54,0.45);",
        formatter: (params: any) => {
          const p = params[0];
          const row = rows[p.dataIndex];
          return `<b style="color:#1fcab8">${row.gre}</b><br/>Taxa: <b>${p.value}%</b><br/>Credenciados: ${row.credenciados} / ${row.inscritos}`;
        },
      },
      grid: { left: 48, right: 18, top: 20, bottom: 44 },
      xAxis: {
        type: "category",
        data: rows.map((item) => item.gre.slice(0, 2)),
        axisLine: { lineStyle: { color: c.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel, fontSize: 11, fontWeight: "bold" },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", color: c.axisLabel },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.splitLineSoft, type: "dashed" } },
      },
      series: [
        {
          name: "Taxa",
          type: "bar",
          data: values.map((v) => {
            const [bottom, top] = barGradient(v);
            return {
              value: v,
              itemStyle: {
                color: { type: "linear" as const, x: 0, y: 1, x2: 0, y2: 0, colorStops: [{ offset: 0, color: bottom }, { offset: 1, color: top }] },
                borderRadius: [8, 8, 0, 0],
                shadowBlur: 10,
                shadowColor: shadowFor(v),
              },
            };
          }),
          barMaxWidth: 32,
          emphasis: {
            itemStyle: {
              opacity: 0.85,
              shadowBlur: 22,
            },
          },
          label: {
            show: true,
            position: "top",
            color: c.rightLabel,
            fontSize: 10,
            fontWeight: "bold" as const,
            formatter: (params: any) => `${Number(params.value).toFixed(0)}%`,
          },
        },
      ],
    };
  }, [filtered, darkMode]);

  const evolutionOption = useMemo<EChartsOption>(() => {
    const c = ct(darkMode);
    const poloNames = Array.from(new Set(filtered.map((item) => item.polo).filter((polo): polo is string => Boolean(polo)))).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    const palette = ["#1fcab8", "#f3aa32", "#72d66b", "#7aa7ff", "#b2df2f", "#df7dd8", "#58c4dd", "#f36f45"];
    const tooltipBase = {
      backgroundColor: "#061f1c",
      borderColor: "#1fcab8",
      borderWidth: 1,
      padding: [10, 14] as [number, number],
      textStyle: { color: "#c8fff4", fontSize: 12.5 },
      extraCssText: "border-radius:8px;box-shadow:0 8px 24px rgba(6,61,54,0.45);",
    };

    if (evolutionView === "horario") {
      const hourSet = new Set<string>();
      const getCredentialHour = (value: string | null) => {
        const match = value?.match(/^(\d{1,2}):/);
        if (!match) return null;
        const hour = Number.parseInt(match[1], 10);
        if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
        return `${String(hour).padStart(2, "0")}:00`;
      };

      for (const item of filtered) {
        if (!item.credenciado) continue;
        const hour = getCredentialHour(item.horaCredenciamento);
        if (hour) hourSet.add(hour);
      }

      const hours = Array.from(hourSet).sort();

      return {
        tooltip: {
          ...tooltipBase,
          trigger: "axis",
          formatter: (params: any) => {
            const total = params.reduce((sum: number, p: any) => sum + Number(p.value ?? 0), 0);
            const lines = params
              .filter((p: any) => Number(p.value ?? 0) > 0)
              .map((p: any) => `${p.marker} ${p.seriesName}: <b>${p.value}</b>`)
              .join("<br/>");
            return `<b style="color:#1fcab8">${params[0]?.axisValue}</b><br/>${lines || "Sem credenciamentos"}<br/><span style="color:#8deadd">Total: <b>${total}</b></span>`;
          },
        },
        legend: {
          top: 4,
          type: "scroll",
          icon: "circle",
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 18,
          textStyle: { color: c.legendText, fontSize: 12 },
        },
        grid: { left: 44, right: 18, top: 42, bottom: 42 },
        xAxis: {
          type: "category",
          data: hours,
          axisLine: { lineStyle: { color: c.axisLine } },
          axisTick: { show: false },
          axisLabel: { color: c.axisLabel, fontSize: 10 },
        },
        yAxis: {
          type: "value",
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: c.splitLineSoft, type: "dashed" } },
          axisLabel: { color: c.axisLabel },
        },
        series: poloNames.map((polo, index) => {
          const color = palette[index % palette.length];
          return {
            name: polo,
            type: "bar",
            data: hours.map(
              (hour) =>
                filtered.filter(
                  (item) =>
                    item.credenciado &&
                    item.polo === polo &&
                    getCredentialHour(item.horaCredenciamento) === hour,
                ).length,
            ),
            barMaxWidth: 22,
            itemStyle: { borderRadius: [6, 6, 0, 0], color },
            emphasis: {
              itemStyle: {
                shadowBlur: 22,
                shadowColor: `${color}88`,
              },
            },
          };
        }),
      };
    }

    const dateSet = new Set<string>();
    for (const item of filtered) {
      if (item.dataInscricao?.match(/^\d{4}-\d{2}-\d{2}$/)) dateSet.add(item.dataInscricao);
    }
    const dates = Array.from(dateSet).sort();
    const formatDate = (date: string) => {
      const [year, month, day] = date.split("-");
      return `${day}/${month}/${year.slice(2)}`;
    };

    return {
      tooltip: {
        ...tooltipBase,
        trigger: "axis",
        formatter: (params: any) => {
          const total = params.reduce((sum: number, p: any) => sum + Number(p.value ?? 0), 0);
          const lines = params
            .filter((p: any) => Number(p.value ?? 0) > 0)
            .map((p: any) => `${p.marker} ${p.seriesName}: <b>${p.value}</b>`)
            .join("<br/>");
          return `<b style="color:#1fcab8">${params[0]?.axisValue}</b><br/>${lines || "Sem inscrições"}<br/><span style="color:#8deadd">Total: <b>${total}</b></span>`;
        },
      },
      legend: {
        top: 4,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 18,
        textStyle: { color: c.legendText, fontSize: 12 },
      },
      grid: { left: 44, right: 18, top: 42, bottom: 40 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dates.map(formatDate),
        axisLine: { lineStyle: { color: c.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: c.axisLabel, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.splitLineSoft, type: "dashed" } },
        axisLabel: { color: c.axisLabel },
      },
      series: poloNames.map((polo, index) => {
        const color = palette[index % palette.length];
        return {
          name: polo,
          type: "line",
          smooth: 0.4,
          symbolSize: 8,
          symbol: "circle",
          color,
          lineStyle: { width: 2.5, shadowBlur: 10, shadowColor: `${color}66` },
          itemStyle: { color, borderColor: "#ffffff", borderWidth: 2 },
          emphasis: { itemStyle: { shadowBlur: 18, shadowColor: `${color}88`, scale: true } },
          data: dates.map(
            (date) =>
              filtered.filter((item) => item.polo === polo && item.dataInscricao === date).length,
          ),
          areaStyle: {
            opacity: 0.06,
            color,
          },
        };
      }),
    };
  }, [evolutionView, filtered, darkMode]);

  const offerOption = useMemo<EChartsOption>(() => {
    const c = ct(darkMode);
    const data = topEntries(countBy(filtered, (item) => (item.tipoOferta ? compactOfferLabel(item.tipoOferta) : null)), 8);
    return {
      color: ["#0ea68f", "#1fcab8", "#b2df2f", "#f3d33b", "#5caa95", "#42b883", "#92c46f", "#8aa39b"],
      tooltip: {
        trigger: "item",
        backgroundColor: "#061f1c",
        borderColor: "#1fcab8",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#c8fff4", fontSize: 12.5 },
        extraCssText: "border-radius:8px;box-shadow:0 8px 24px rgba(6,61,54,0.45);",
        formatter: (params: any) =>
          `<b style="color:#1fcab8">${params.name}</b><br/>${params.value} escolas &nbsp;<b>${params.percent}%</b>`,
      },
      legend: {
        bottom: 4,
        type: "scroll",
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 14,
        icon: "circle",
        textStyle: { color: c.legendText, fontSize: 12 },
      },
      series: [
        {
          name: "Tipo de oferta",
          type: "pie",
          radius: ["42%", "72%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: c.pieBorder,
            borderWidth: 2.5,
            shadowBlur: 14,
            shadowColor: "rgba(16,83,70,0.18)",
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
            itemStyle: {
              shadowBlur: 32,
              shadowColor: "rgba(31,202,184,0.55)",
              borderWidth: 3,
              borderColor: c.pieBorder,
            },
          },
          label: {
            color: c.pieLabel,
            fontSize: 12,
            fontWeight: "bold" as const,
            formatter: "{b}: {d}%",
            textShadowBlur: 0,
          },
          labelLine: {
            length: 10,
            length2: 12,
            smooth: true,
            lineStyle: { width: 1.5, color: c.pieLabelLine },
          },
          data,
        },
      ],
    };
  }, [filtered, darkMode]);

  const poloOption = useMemo<EChartsOption>(() => {
    const poloC = ct(darkMode);
    const polos = Array.from(new Set(filtered.map((item) => compactLabel(item.polo)))).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    const byPolo = (status: CredentialRecord["statusCredenciamento"]) =>
      polos.map(
        (polo) =>
          filtered.filter((item) => compactLabel(item.polo) === polo && item.statusCredenciamento === status).length,
      );

    const credData = byPolo("Credenciado");
    const ausentesData = byPolo("Ausente");
    const naoInscData = byPolo("Nao inscrito");

    const labelStyle = {
      show: true,
      position: "inside" as const,
      fontSize: 11,
      fontWeight: "bold" as const,
      formatter: (params: any) => (params.value > 0 ? `${params.value}` : ""),
    };

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#061f1c",
        borderColor: "#1fcab8",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#c8fff4", fontSize: 12.5 },
        extraCssText: "border-radius:8px;box-shadow:0 8px 24px rgba(6,61,54,0.45);",
        formatter: (params: any) => {
          const total = params.reduce((sum: number, p: any) => sum + (p.value ?? 0), 0);
          const lines = params.map((p: any) =>
            `${p.marker} ${p.seriesName}: <b>${p.value}</b> <span style="color:#8deadd">(${total > 0 ? ((p.value / total) * 100).toFixed(0) : 0}%)</span>`
          ).join("<br/>");
          return `<b style="color:#1fcab8">${params[0]?.axisValue}</b><br/>${lines}<br/><span style="color:#8deadd">Total: <b>${total}</b></span>`;
        },
      },
      legend: {
        top: 4,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 18,
        textStyle: { color: poloC.legendText, fontSize: 12 },
      },
      grid: { left: 44, right: 18, top: 42, bottom: 40 },
      xAxis: {
        type: "category",
        data: polos,
        axisLine: { lineStyle: { color: poloC.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: poloC.axisLabelBold, fontSize: 11, fontWeight: "bold" },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: poloC.splitLineSoft, type: "dashed" } },
        axisLabel: { color: poloC.axisLabel },
      },
      series: [
        {
          name: "Credenciados",
          type: "bar",
          stack: "total",
          data: credData.map((v) => ({
            value: v,
            itemStyle: {
              color: { type: "linear" as const, x: 0, y: 1, x2: 0, y2: 0, colorStops: [{ offset: 0, color: "#0a7260" }, { offset: 1, color: "#1fcab8" }] },
              shadowBlur: 6,
              shadowColor: "rgba(31,202,184,0.25)",
            },
          })),
          barMaxWidth: 64,
          itemStyle: { borderRadius: [0, 0, 0, 0] },
          emphasis: { itemStyle: { shadowBlur: 18, shadowColor: "rgba(31,202,184,0.5)" } },
          label: { ...labelStyle, color: "#ffffff" },
        },
        {
          name: "Ausentes",
          type: "bar",
          stack: "total",
          data: ausentesData.map((v) => ({
            value: v,
            itemStyle: {
              color: { type: "linear" as const, x: 0, y: 1, x2: 0, y2: 0, colorStops: [{ offset: 0, color: "#c97e10" }, { offset: 1, color: "#f3c048" }] },
            },
          })),
          barMaxWidth: 64,
          emphasis: { itemStyle: { shadowBlur: 14, shadowColor: "rgba(243,170,50,0.5)" } },
          label: { ...labelStyle, color: "#5a3300" },
        },
        {
          name: "Não inscritos",
          type: "bar",
          stack: "total",
          data: naoInscData.map((v) => ({
            value: v,
            itemStyle: {
              color: { type: "linear" as const, x: 0, y: 1, x2: 0, y2: 0, colorStops: [{ offset: 0, color: "#4a5e5a" }, { offset: 1, color: "#7d9691" }] },
              borderRadius: [6, 6, 0, 0],
            },
          })),
          barMaxWidth: 64,
          emphasis: { itemStyle: { shadowBlur: 14, shadowColor: "rgba(107,127,122,0.5)" } },
          label: { ...labelStyle, color: "#ffffff" },
        },
      ],
    };
  }, [filtered, darkMode]);

  const functionAreaOption = useMemo<EChartsOption>(() => {
    const c = ct(darkMode);
    const functionRows = filtered.filter((item) => {
      if (functionView === "geral") return true;
      const funcao = normalizeSearchText(item.funcao);
      if (functionView === "professor") return funcao.includes("professor");
      if (functionView === "coordenador") return funcao.includes("coordenador");
      return funcao.includes("diretor");
    });
    const combo = countBy(functionRows, (item) =>
      functionView === "geral"
        ? `${compactLabel(item.funcao)} | ${compactLabel(item.areaFormacao)}`
        : compactLabel(item.areaFormacao),
    );
    const data = topEntries(combo, 10).reverse();
    const maxVal = Math.max(...data.map((d) => d.value));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "none" },
        backgroundColor: "#061f1c",
        borderColor: "#1fcab8",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#c8fff4", fontSize: 12.5 },
        extraCssText: "border-radius:8px;box-shadow:0 8px 24px rgba(6,61,54,0.45);",
        formatter: (params: any) => {
          const p = params[0];
          return `<b style="color:#1fcab8">${p.name}</b><br/>Participantes: <b>${p.value}</b>`;
        },
      },
      grid: { left: 172, right: 56, top: 12, bottom: 20 },
      xAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.splitLineSoft, type: "dashed" } },
        axisLabel: { color: c.axisLabel, fontSize: 11 },
      },
      yAxis: {
        type: "category",
        data: data.map((item) => item.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: c.axisLabelBold,
          fontSize: 11.5,
          fontWeight: "bold" as const,
          width: 158,
          overflow: "truncate",
        },
      },
      series: [
        {
          name: "Participantes",
          type: "bar",
          data: data.map((item) => ({
            value: item.value,
            itemStyle: {
              color: {
                type: "linear" as const,
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: item.value === maxVal
                  ? [{ offset: 0, color: "#0a7260" }, { offset: 1, color: "#1fcab8" }]
                  : [{ offset: 0, color: "#0f7c6a" }, { offset: 1, color: "#3dbfae" }],
              },
              borderRadius: [0, 8, 8, 0],
              shadowBlur: item.value === maxVal ? 14 : 0,
              shadowColor: "rgba(31,202,184,0.4)",
            },
          })),
          barMaxWidth: 20,
          emphasis: {
            itemStyle: {
              color: {
                type: "linear" as const,
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [{ offset: 0, color: "#0a7260" }, { offset: 1, color: "#1fcab8" }],
              },
              shadowBlur: 22,
              shadowColor: "rgba(31,202,184,0.55)",
            },
          },
          label: {
            show: true,
            position: "right",
            color: c.rightLabel,
            fontSize: 10.5,
            fontWeight: "bold" as const,
            formatter: (params: any) => `${params.value}`,
          },
        },
      ],
    };
  }, [filtered, functionView, darkMode]);

  const mapOption = useMemo<EChartsOption>(() => {
    const municipalityNames = geoJson.features
      .map((f) => f.properties.name ?? f.properties.nome ?? f.properties.description)
      .filter((name): name is string => Boolean(name));
    const lookup = buildMunicipalityLookup(municipalityNames);
    const rowsByCity = new Map<string, CredentialRecord[]>();

    for (const row of filtered) {
      if (!row.cidade) continue;
      const city = lookup.get(normalizeSearchText(row.cidade)) ?? row.cidade;
      const current = rowsByCity.get(city) ?? [];
      current.push(row);
      rowsByCity.set(city, current);
    }

    const normalizedRegions = new Map(
      Object.entries(regions).map(([city, region]) => [normalizeSearchText(city), region])
    );

    // Credenciados per region (for scatter labels)
    const regionCounts = new Map<string, number>();
    for (const item of filtered) {
      if (!item.credenciado || !item.cidade) continue;
      const region = normalizedRegions.get(normalizeSearchText(item.cidade)) ?? "Outros";
      regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
    }

    // Base color per region — vibrant enough to be clearly distinct
    const regionBaseColor: Record<string, string> = darkMode
      ? {
          "Mata/Litoral":      "#1a8a7a",
          "Agreste Paraibano": "#1e7844",
          "Borborema":         "#8a6a12",
          "Sertão Paraibano":  "#155c4e",
        }
      : {
          "Mata/Litoral":      "#7dc8bf",
          "Agreste Paraibano": "#7dbc96",
          "Borborema":         "#d4c06c",
          "Sertão Paraibano":  "#62b0a4",
        };

    // Hover color per region (bright, full saturation)
    const regionHoverColor: Record<string, string> = {
      "Mata/Litoral":      "#1fcab8",
      "Agreste Paraibano": "#2fbf67",
      "Borborema":         "#f3d33b",
      "Sertão Paraibano":  "#0ea68f",
    };

    // Internal municipality border: very faint, shows subdivisions subtly
    const internalBorder = darkMode ? "rgba(31,202,184,0.10)" : "rgba(0,0,0,0.12)";

    const mapData = municipalityNames.map((city) => {
      const region = normalizedRegions.get(normalizeSearchText(city)) ?? "Sem região";
      const baseColor = regionBaseColor[region] ?? (darkMode ? "#1e2e2a" : "#c0d8ce");
      const hoverColor = regionHoverColor[region] ?? "#1fcab8";
      return {
        name: city,
        value: rowsByCity.get(city)?.length ?? 0,
        region,
        itemStyle: {
          areaColor: baseColor,
          borderColor: internalBorder,
          borderWidth: 0.4,
        },
        emphasis: {
          itemStyle: {
            areaColor: hoverColor,
            borderColor: "#1fcab8",
            borderWidth: 0.8,
            shadowBlur: 16,
            shadowColor: `${hoverColor}66`,
          },
        },
      };
    });

    // Scatter label data: region short name + credenciados count at each region centroid
    const shortToFull: Record<string, string> = {
      "Mata/Litoral": "Mata/Litoral",
      "Agreste":      "Agreste Paraibano",
      "Borborema":    "Borborema",
      "Sertão":       "Sertão Paraibano",
    };
    const regionLabelData = [
      { short: "Mata/Litoral", coord: [-35.1,  -7.05] as [number, number] },
      { short: "Agreste",      coord: [-35.8,  -7.0]  as [number, number] },
      { short: "Borborema",    coord: [-36.65, -7.55] as [number, number] },
      { short: "Sertão",       coord: [-37.8,  -7.15] as [number, number] },
    ].map(({ short, coord }) => ({
      value: coord,
      short,
      count: regionCounts.get(shortToFull[short] ?? short) ?? 0,
    }));

    return {
      geo: {
        map: "Paraiba",
        aspectScale: 0.9,
        zoom: mapZoom,
        roam: "move",
        silent: false,
        label: { show: false },
        regions: mapData.map((item) => ({
          name: item.name,
          itemStyle: item.itemStyle,
          emphasis: item.emphasis,
        })),
        itemStyle: {
          areaColor: darkMode ? "#153d36" : "#d6eee8",
          borderColor: internalBorder,
          borderWidth: 0.45,
        },
        emphasis: {
          label: { show: false },
          itemStyle: {
            borderColor: "#1fcab8",
            borderWidth: 0.8,
          },
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "#061f1c",
        borderColor: "#1fcab8",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#c8fff4", fontSize: 12.5 },
        extraCssText: "border-radius:8px;box-shadow:0 8px 24px rgba(6,61,54,0.45);",
        formatter: (params: any) => {
          if (params.seriesType === "scatter") return false as any;
          const d = params.data ?? {};
          const city = params.name ?? "";
          const region = d.region ?? normalizedRegions.get(normalizeSearchText(city)) ?? "—";
          const count = regionCounts.get(region) ?? 0;
          const records = d.value ?? rowsByCity.get(city)?.length ?? 0;
          return `<b style="color:#1fcab8">${city}</b><br/>Região: ${region}<br/>Registros no filtro: <b>${formatNumber(records)}</b><br/>Credenciados na região: <b>${formatNumber(count)}</b>`;
        },
      },
      series: [
        {
          type: "map",
          map: "Paraiba",
          geoIndex: 0,
          data: mapData,
          label: { show: false },
          emphasis: { label: { show: false } },
          select: { label: { show: false }, itemStyle: { areaColor: "#f3aa32" } },
        },
        {
          type: "scatter",
          coordinateSystem: "geo",
          symbolSize: 0,
          silent: true,
          label: {
            show: true,
            rich: {
              n: {
                color: darkMode ? "#d4f5ee" : "#1a4d44",
                fontSize: 12,
                fontWeight: 700 as const,
                lineHeight: 18,
                textShadowBlur: 10,
                textShadowColor: "rgba(0,0,0,0.9)",
              },
              v: {
                color: "#ffffff",
                fontSize: 28,
                fontWeight: 900 as const,
                lineHeight: 34,
                textShadowBlur: 12,
                textShadowColor: "rgba(0,0,0,0.9)",
              },
            },
            formatter: (params: any) => `{n|${params.data.short}}\n{v|${formatNumber(params.data.count)}}`,
          },
          data: regionLabelData,
        },
      ],
    };
  }, [filtered, geoJson, mapZoom, regions, darkMode]);

  const filterConfigs = useMemo(
    () => [
      { key: "polo", label: "Polo", value: filters.polo, options: uniqueOptions(credentials.map((item) => item.polo)) },
      {
        key: "gre",
        label: "GRE",
        value: filters.gre,
        options: uniqueOptions(credentials.map((item) => item.gre), true),
      },
      {
        key: "categoria",
        label: "Categoria",
        value: filters.categoria,
        options: uniqueOptions(credentials.map((item) => item.categoria)),
      },
      { key: "status", label: "Status", value: filters.status, options: statusOptions },
    ],
    [credentials, filters, statusOptions],
  );

  return (
    <div className="page-stack">
      <div className="page-header">
        <PageTitle
          title="Credenciamento"
          description="Acompanhamento do público inscrito, presença e credenciamento por polo, GRE, município e perfil formativo."
        />
        <FilterBar
          inline
          filters={filterConfigs}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onClear={() => setFilters(clearFilters)}
        />
      </div>

      <section className="metric-grid metric-grid--six">
        <MetricCard label="Público" value={formatNumber(metrics.publico)} detail="registros filtrados" icon={Users} tone="primary" />
        <MetricCard label="Inscritos" value={formatNumber(metrics.inscritos)} detail={formatPercentValue(percent(metrics.inscritos, metrics.publico))} icon={UserCheck} tone="success" />
        <MetricCard label="Não inscritos" value={formatNumber(metrics.naoInscritos)} detail={formatPercentValue(percent(metrics.naoInscritos, metrics.publico))} icon={GraduationCap} tone="neutral" />
        <MetricCard label="Credenciados" value={formatNumber(metrics.credenciados)} detail={formatPercentValue(percent(metrics.credenciados, metrics.inscritos))} icon={BadgeCheck} tone="success" trend="up" />
        <MetricCard label="Ausentes" value={formatNumber(metrics.ausentes)} detail={formatPercentValue(percent(metrics.ausentes, metrics.inscritos))} icon={Clock3} tone="warning" />
        <MetricCard label="Não credenciados" value={formatNumber(metrics.naoCredenciados)} detail={formatPercentValue(percent(metrics.naoCredenciados, metrics.publico))} icon={BadgeX} tone="neutral" />
      </section>

      <section className="chart-grid">
        <ChartCard
          title="Taxa de credenciamento por GRE"
          subtitle="Credenciados sobre inscritos"
          option={greRateOption}
          height={360}
        />
        <ChartCard
          title="Mapa da Paraíba por região"
          subtitle="Mata/Litoral, Agreste, Borborema e Sertão"
          option={mapOption}
          height={360}
          actions={
            <div className="map-view-toggle" aria-label="Zoom do mapa">
              <button
                type="button"
                className="map-view-toggle__button"
                title="Diminuir zoom"
                onClick={() => setMapZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                className="map-view-toggle__button"
                title="Resetar zoom"
                onClick={() => setMapZoom(1)}
                style={{ fontSize: "0.7rem", fontWeight: 800, minWidth: 28 }}
              >
                {mapZoom === 1 ? "1×" : `${mapZoom}×`}
              </button>
              <button
                type="button"
                className="map-view-toggle__button"
                title="Aumentar zoom"
                onClick={() => setMapZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)))}
              >
                <Plus size={13} />
              </button>
            </div>
          }
        />
        <ChartCard
          title={evolutionView === "data" ? "Inscrições por data e polo" : "Credenciamentos por horário e polo"}
          subtitle={
            evolutionView === "data"
              ? "Comparação diária entre polos"
              : "Comparação por faixa horária entre polos"
          }
          option={evolutionOption}
          actions={
            <div className="map-view-toggle" aria-label="Visão do gráfico de evolução">
              {[
                { value: "data", label: "Por data" },
                { value: "horario", label: "Por horário" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={
                    evolutionView === item.value
                      ? "map-view-toggle__button map-view-toggle__button--active"
                      : "map-view-toggle__button"
                  }
                  onClick={() => setEvolutionView(item.value as EvolutionView)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />
        <ChartCard title="Tipo de oferta" subtitle="Perfil das escolas inscritas" option={offerOption} />
        <ChartCard
          title="Função e área de formação"
          subtitle={functionView === "geral" ? "Top combinações" : "Áreas de formação por função"}
          option={functionAreaOption}
          actions={
            <div className="map-view-toggle" aria-label="Visão por função">
              {[
                { value: "geral", label: "Geral" },
                { value: "professor", label: "Professor" },
                { value: "coordenador", label: "Coordenador" },
                { value: "diretor", label: "Diretor" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={
                    functionView === item.value
                      ? "map-view-toggle__button map-view-toggle__button--active"
                      : "map-view-toggle__button"
                  }
                  onClick={() => setFunctionView(item.value as FunctionView)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />
        <ChartCard title="Credenciamento por polo" subtitle="Distribuição por situação" option={poloOption} />
      </section>
    </div>
  );
}

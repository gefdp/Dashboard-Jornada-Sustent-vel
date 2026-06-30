import type {
  CredentialRecord,
  DashboardData,
  EfficiencySchool,
  EvaluationRecord,
  Nullable,
  RawDashboardData,
  RawRecord,
  SchoolStatus,
  SelectOption,
} from "../types";

export const ALL_VALUE = "__all__";

export const GRE_OPTIONS = Array.from({ length: 16 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return `${number}ª GRE`;
});

export const SCORE_LABELS: Record<string, string> = {
  q1_relevancia_conteudos: "Conteúdos",
  q2_carga_horaria: "Carga horária",
  q3_contribuicao_pedagogica: "Contribuição",
  q4_recursos_materiais: "Recursos",
  q5_avaliacao_formadores: "Formadores",
  q6_metodologias_utilizadas: "Metodologias",
  q7_alimentacao: "Alimentação",
  q8_organizacao_evento: "Organização",
  q9_formacao_geral: "Satisfação geral",
  q10_programacao: "Programação",
};

const SCORE_KEYS = Object.keys(SCORE_LABELS);
const FIVE_POINT_KEYS = new Set(["q9_formacao_geral", "q10_programacao"]);
const PEDAGOGICAL_KEYS = [
  "q1_relevancia_conteudos",
  "q3_contribuicao_pedagogica",
  "q5_avaliacao_formadores",
  "q6_metodologias_utilizadas",
];
const LOGISTIC_KEYS = [
  "q2_carga_horaria",
  "q4_recursos_materiais",
  "q7_alimentacao",
  "q8_organizacao_evento",
  "q10_programacao",
];

const EVALUATION_GRE_FIELDS = [
  "gre_01",
  "gre_02",
  "gre_03",
  "gre_04",
  "gre_05",
  "6a_gre",
  "gre_07",
  "gre_08",
  "gre_09",
  "gre_10",
  "gre_11",
  "gre_12",
  "gre_13",
  "gre_14",
  "gre_15",
  "gre_16",
];

const INVALID_MARKERS = new Set(["", "26", "null", "undefined", "nan", "não credenciado", "nao credenciado"]);

export function cleanValue(value: unknown): Nullable<string | number> {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value === 26 || Number.isNaN(value) ? null : value;
  const text = String(value).trim();
  if (INVALID_MARKERS.has(text.toLocaleLowerCase("pt-BR"))) return null;
  return text;
}

export function textValue(value: unknown): Nullable<string> {
  const clean = cleanValue(value);
  if (clean === null) return null;
  return String(clean).trim();
}

export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function normalizeGre(value: unknown): Nullable<string> {
  const text = textValue(value);
  if (!text) return null;
  const match =
    text.match(/(?:^|\b)(\d{1,2})\s*(?:[ª°ºa])?\s*GRE/i) ??
    text.match(/(?:^|\b)(\d{1,2})\s*(?:[ª°ºa])/i) ??
    text.match(/(?:^|\b)(\d{1,2})(?:\b|$)/);
  if (!match) return null;
  const number = Number.parseInt(match[1], 10);
  if (!Number.isFinite(number) || number < 1 || number > 16) return null;
  return GRE_OPTIONS[number - 1];
}

export function greSort(a: Nullable<string>, b: Nullable<string>) {
  const ai = GRE_OPTIONS.indexOf(a ?? "");
  const bi = GRE_OPTIONS.indexOf(b ?? "");
  if (ai === -1 && bi === -1) return String(a ?? "").localeCompare(String(b ?? ""), "pt-BR");
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

export function normalizeInep(value: unknown): Nullable<string> {
  const text = textValue(value);
  if (!text) return null;
  const match = text.match(/\b\d{8}\b/);
  return match?.[0] ?? null;
}

export function isYes(value: unknown): boolean {
  const normalized = normalizeSearchText(textValue(value));
  return normalized === "sim" || normalized === "s" || normalized === "yes";
}

export function mean(values: Array<Nullable<number>>): Nullable<number> {
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!numbers.length) return null;
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

export function formatDecimal(value: Nullable<number>, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercentValue(value: number): string {
  return `${formatDecimal(value, 1)}%`;
}

export function uniqueOptions(values: Array<Nullable<string>>, includeGreSort = false): SelectOption[] {
  const unique = Array.from(new Set(values.filter((value): value is string => Boolean(value))));
  unique.sort(includeGreSort ? greSort : (a, b) => a.localeCompare(b, "pt-BR"));
  return unique.map((value) => ({ label: value, value }));
}

export function countBy<T>(rows: T[], getKey: (row: T) => Nullable<string>): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row) ?? "Sem informação";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function averageBy<T>(
  rows: T[],
  getKey: (row: T) => Nullable<string>,
  getValue: (row: T) => Nullable<number>,
): Array<{ name: string; value: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const value = getValue(row);
    if (value === null || value === undefined) continue;
    const key = getKey(row) ?? "Sem informação";
    const current = map.get(key) ?? { total: 0, count: 0 };
    current.total += value;
    current.count += 1;
    map.set(key, current);
  }
  return Array.from(map.entries()).map(([name, item]) => ({
    name,
    value: item.total / item.count,
    count: item.count,
  }));
}

function parseEvaluationSchool(row: RawRecord) {
  for (const field of EVALUATION_GRE_FIELDS) {
    const value = textValue(row[field]);
    if (!value) continue;
    const parts = value.split(/\s+-\s+/);
    return {
      gre: normalizeGre(value),
      inep: normalizeInep(value),
      escola: parts.length >= 3 ? parts.slice(2).join(" - ").trim() : null,
    };
  }
  return { gre: null, inep: null, escola: null };
}

function normalizedScore(row: RawRecord, key: string): Nullable<number> {
  const clean = cleanValue(row[key]);
  if (clean === null) return null;
  const score = typeof clean === "number" ? clean : Number.parseFloat(clean.replace(",", "."));
  if (!Number.isFinite(score) || score === 26) return null;
  const normalized = FIVE_POINT_KEYS.has(key) ? score * 2 : score;
  return Math.max(0, Math.min(10, normalized));
}

function normalizeCredential(row: RawRecord, rowIndex: number): CredentialRecord {
  const inscrito = isYes(row.inscrito);
  const credenciado = isYes(row.credenciado);
  const statusCredenciamento: CredentialRecord["statusCredenciamento"] = credenciado
    ? "Credenciado"
    : inscrito
      ? "Ausente"
      : "Nao inscrito";

  return {
    id: `cred-${rowIndex}`,
    rowIndex,
    polo: textValue(row.polo),
    gre: normalizeGre(row.gre) ?? normalizeGre(row.gre_2),
    categoria: textValue(row.categoria),
    statusInscricao: textValue(row.status_inscricao),
    statusCredenciamento,
    inscrito,
    credenciado,
    dataInscricao: textValue(row.data_inscricao),
    horaInscricao: textValue(row.hora_inscricao),
    dataCredenciamento: textValue(row.data_credenciamento),
    horaCredenciamento: textValue(row.hora_credenciamento),
    areaFormacao: textValue(row.area_formacao),
    cidade: textValue(row.cidade_escola),
    inep: normalizeInep(row.inep),
    escola: textValue(row.escola),
    funcao: textValue(row.funcao_representante_escolar),
    localidade: textValue(row.localidade_escola),
    tipoOferta: textValue(row.tipo_oferta_escola),
    gerenciaPedagogica: textValue(row.gerencia_pedagogica),
  };
}

function normalizeEvaluation(
  row: RawRecord,
  rowIndex: number,
  credentialsByInep: Map<string, CredentialRecord[]>,
): EvaluationRecord {
  const school = parseEvaluationSchool(row);
  const inep = school.inep;
  const linkedCredential = inep ? credentialsByInep.get(inep)?.find((item) => item.cidade || item.polo) : undefined;
  const scores = Object.fromEntries(SCORE_KEYS.map((key) => [key, normalizedScore(row, key)]));
  const mediaPedagogica = mean(PEDAGOGICAL_KEYS.map((key) => scores[key]));
  const mediaLogistica = mean(LOGISTIC_KEYS.map((key) => scores[key]));
  const mediaGeral = mean(SCORE_KEYS.map((key) => scores[key]));

  return {
    id: `avaliacao-${rowIndex}`,
    rowIndex,
    polo: textValue(row.polo_participacao),
    gre: normalizeGre(row.gerencia_regional) ?? school.gre,
    funcao: textValue(row.funcao_representante_escolar),
    inep,
    escola: school.escola,
    municipio: linkedCredential?.cidade ?? null,
    dataHora: textValue(row.carimbo_data_hora),
    scores,
    mediaPedagogica,
    mediaLogistica,
    mediaGeral,
    positiva: (mediaGeral ?? 0) >= 8,
    comentario: textValue(row.q11_comentario_final),
  };
}

function normalizeSchool(
  row: RawRecord,
  credentialsByInep: Map<string, CredentialRecord[]>,
): Nullable<EfficiencySchool> {
  const inep = normalizeInep(row.inep);
  if (!inep) return null;
  const linkedCredentials = credentialsByInep.get(inep) ?? [];
  const hasCredentialed = linkedCredentials.some((item) => item.credenciado);
  const hasRegistered = linkedCredentials.some((item) => item.inscrito);
  const status: SchoolStatus = hasCredentialed ? "Credenciada" : hasRegistered ? "Inscrita e ausente" : "Nao inscrita";
  const linked = linkedCredentials.find((item) => item.cidade || item.polo) ?? linkedCredentials[0];

  return {
    id: inep,
    gre: normalizeGre(row.gre) ?? linked?.gre ?? null,
    inep,
    escola: textValue(row.escola) ?? linked?.escola ?? null,
    municipio: linked?.cidade ?? null,
    polo: linked?.polo ?? null,
    status,
  };
}

export function normalizeDashboardData(raw: RawDashboardData): DashboardData {
  const credentials = (raw.credenciamento ?? []).map(normalizeCredential);
  const credentialsByInep = new Map<string, CredentialRecord[]>();
  for (const credential of credentials) {
    if (!credential.inep) continue;
    const current = credentialsByInep.get(credential.inep) ?? [];
    current.push(credential);
    credentialsByInep.set(credential.inep, current);
  }

  const evaluations = (raw.avaliacao ?? []).map((row, index) => normalizeEvaluation(row, index, credentialsByInep));
  const schoolMap = new Map<string, EfficiencySchool>();
  for (const row of raw.indice_eficiencia_gestao_ieg ?? []) {
    const school = normalizeSchool(row, credentialsByInep);
    if (school) schoolMap.set(school.inep, school);
  }

  return {
    credentials,
    evaluations,
    schools: Array.from(schoolMap.values()).sort((a, b) => {
      const gre = greSort(a.gre, b.gre);
      if (gre !== 0) return gre;
      return (a.escola ?? "").localeCompare(b.escola ?? "", "pt-BR");
    }),
  };
}

export function filterByOption(value: Nullable<string>, selected: string): boolean {
  return selected === ALL_VALUE || value === selected;
}

export function statusLabel(status: CredentialRecord["statusCredenciamento"] | SchoolStatus) {
  return status.replace("Nao", "Não");
}

export function compactLabel(value: Nullable<string>) {
  return value ?? "Sem informação";
}

export function topEntries(map: Map<string, number>, limit = 10) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));
}

export function buildMunicipalityLookup(featureNames: string[]) {
  return new Map(featureNames.map((name) => [normalizeSearchText(name), name]));
}

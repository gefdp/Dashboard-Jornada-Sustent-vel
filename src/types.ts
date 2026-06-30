export type Nullable<T> = T | null;

export type RawRecord = Record<string, unknown>;

export interface RawDashboardData {
  metadata?: RawRecord;
  credenciamento: RawRecord[];
  avaliacao: RawRecord[];
  indice_eficiencia_gestao_ieg: RawRecord[];
}

export interface GeoJsonFeature {
  type: string;
  properties: {
    id?: string;
    name?: string;
    nome?: string;
    description?: string;
    [key: string]: unknown;
  };
  geometry: RawRecord;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export interface CredentialRecord {
  id: string;
  rowIndex: number;
  polo: Nullable<string>;
  gre: Nullable<string>;
  categoria: Nullable<string>;
  statusInscricao: Nullable<string>;
  statusCredenciamento: "Credenciado" | "Ausente" | "Nao inscrito";
  inscrito: boolean;
  credenciado: boolean;
  dataInscricao: Nullable<string>;
  horaInscricao: Nullable<string>;
  dataCredenciamento: Nullable<string>;
  horaCredenciamento: Nullable<string>;
  areaFormacao: Nullable<string>;
  cidade: Nullable<string>;
  inep: Nullable<string>;
  escola: Nullable<string>;
  funcao: Nullable<string>;
  localidade: Nullable<string>;
  tipoOferta: Nullable<string>;
  gerenciaPedagogica: Nullable<string>;
}

export interface EvaluationRecord {
  id: string;
  rowIndex: number;
  polo: Nullable<string>;
  gre: Nullable<string>;
  funcao: Nullable<string>;
  inep: Nullable<string>;
  escola: Nullable<string>;
  municipio: Nullable<string>;
  dataHora: Nullable<string>;
  scores: Record<string, Nullable<number>>;
  mediaPedagogica: Nullable<number>;
  mediaLogistica: Nullable<number>;
  mediaGeral: Nullable<number>;
  positiva: boolean;
  comentario: Nullable<string>;
}

export type SchoolStatus = "Credenciada" | "Inscrita e ausente" | "Nao inscrita";

export interface EfficiencySchool {
  id: string;
  gre: Nullable<string>;
  inep: string;
  escola: Nullable<string>;
  municipio: Nullable<string>;
  polo: Nullable<string>;
  status: SchoolStatus;
}

export interface DashboardData {
  credentials: CredentialRecord[];
  evaluations: EvaluationRecord[];
  schools: EfficiencySchool[];
}

export interface SelectOption {
  label: string;
  value: string;
}

export type RegionByMunicipality = Record<string, string>;

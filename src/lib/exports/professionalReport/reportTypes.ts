export interface ReportMember {
  id: string;
  member_mark: string;
  section: string | null;
  required_dft_microns: number;
  steel_type?: string | null;
  coating_system?: string | null;
}

export interface ReportReading {
  id: string;
  created_at: string;
  sequence_number: number;
  dft_average: number;
  reading_type: string | null;
  position?: string | null;
  face?: string | null;
  notes?: string | null;
}

export interface ReportProject {
  id: string;
  name: string;
  client_name?: string | null;
  location?: string | null;
  organizations?: {
    id: string;
    name: string;
    logo_url?: string | null;
  } | null;
}

export interface ReportStatistics {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  range: number;
  passCount: number;
  failCount: number;
  passRate: number;
}

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
  label: string;
}

export interface MemberReportData {
  project: ReportProject;
  member: ReportMember;
  readings: ReportReading[];
  stats: ReportStatistics;
  histogram: HistogramBin[];
  requiredDft: number;
  inspectionDate?: string;
}

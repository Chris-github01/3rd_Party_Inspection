export type SystemType = 'Intumescent' | 'Cementitious' | 'Protective Coating' | 'Firestopping';
export type ElementType = 'Beam' | 'Column' | 'Slab' | 'Penetration' | 'Other';
export type Severity = 'Low' | 'Medium' | 'High';
export type Extent = 'Localised' | 'Moderate' | 'Widespread';

export interface AIAnalysisResult {
  defect_type: string;
  severity: Severity;
  observation: string;
  confidence: number;
  needsReview: boolean;
}

export interface InspectionAIReport {
  id: string;
  project_name: string;
  inspector_name: string;
  created_at: string;
  user_id?: string;
}

export interface InspectionAIItem {
  id: string;
  report_id: string;
  image_url: string;
  system_type: string;
  element: string;
  defect_type: string;
  severity: string;
  observation: string;
  non_conformance: string;
  recommendation: string;
  risk: string;
  confidence: number;
  location_level: string;
  location_grid: string;
  location_description: string;
  extent: Extent;
  defect_type_override: string | null;
  severity_override: string | null;
  observation_override: string | null;
  inspector_override: boolean;
  annotated_image_url: string | null;
  created_at: string;
}

export interface CapturedItem {
  imageFile: File;
  imagePreviewUrl: string;
  annotatedImageUrl: string | null;
  systemType: SystemType;
  element: ElementType;
  locationLevel: string;
  locationGrid: string;
  locationDescription: string;
  extent: Extent;
  analysisResult: AIAnalysisResult | null;
  nonConformance: string;
  recommendation: string;
  risk: string;
  defectTypeOverride: string | null;
  severityOverride: string | null;
  observationOverride: string | null;
  inspectorOverride: boolean;
  analysisStatus: AnalysisStatus;
  isAnalysing: boolean;
  isSaved: boolean;
  savedId?: string;
  savedImageUrl?: string;
}

export type AppPhase = 'setup' | 'capture' | 'report';

export type AnalysisStatus =
  | 'idle'
  | 'queued'
  | 'analysing'
  | 'retrying'
  | 'done'
  | 'manual';

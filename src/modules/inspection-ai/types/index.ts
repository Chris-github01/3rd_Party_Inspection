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
  likely_cause?: string;
  next_checks?: string[];
  escalate?: boolean;
  escalation_reason?: string;
  remediation_guidance?: string;
}

export type ObservedConcern =
  | 'Cracking'
  | 'Rust / Corrosion'
  | 'Damage'
  | 'Missing Material'
  | 'Blistering / Bubbling'
  | 'Delamination'
  | 'Unsure';

export type Environment = 'Internal' | 'External' | 'Exposed / Harsh';

export interface CaptureIntakeContext {
  systemType: SystemType;
  element: ElementType;
  environment: Environment;
  observedConcern: ObservedConcern;
  isNewInstall: boolean;
}

export interface InspectionAIProject {
  id: string;
  user_id: string;
  project_name: string;
  client_name: string;
  site_location: string;
  created_at: string;
}

export interface InspectionAIReport {
  id: string;
  project_name: string;
  inspector_name: string;
  created_at: string;
  user_id?: string;
  project_id?: string | null;
  status?: 'draft' | 'completed';
  item_count?: number;
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
  environment: Environment;
  observedConcern: ObservedConcern;
  isNewInstall: boolean;
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

export interface InspectionAIBlock {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface InspectionAILevel {
  id: string;
  block_id: string;
  name: string;
  created_at: string;
}

export interface InspectionAIDrawing {
  id: string;
  level_id: string;
  name: string;
  file_url: string;
  file_type: 'image' | 'pdf';
  created_at: string;
}

export interface InspectionAIPin {
  id: string;
  drawing_id: string;
  item_id: string | null;
  x_percent: number;
  y_percent: number;
  severity: string;
  label: string;
  created_at: string;
}

export type AnalysisStatus =
  | 'idle'
  | 'queued'
  | 'analysing'
  | 'retrying'
  | 'done'
  | 'manual';

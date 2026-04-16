export type SystemType = 'Intumescent' | 'Cementitious' | 'Protective Coating' | 'Firestopping';
export type ElementType = 'Beam' | 'Column' | 'Slab' | 'Penetration' | 'Other';
export type Severity = 'Low' | 'Medium' | 'High';

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
  created_at: string;
}

export interface CapturedItem {
  imageFile: File;
  imagePreviewUrl: string;
  systemType: SystemType;
  element: ElementType;
  analysisResult: AIAnalysisResult | null;
  nonConformance: string;
  recommendation: string;
  risk: string;
  isAnalysing: boolean;
  isSaved: boolean;
  savedId?: string;
  savedImageUrl?: string;
}

export type AppPhase = 'setup' | 'capture' | 'report';

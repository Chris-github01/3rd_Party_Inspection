export type ParsingJobStatus =
  | 'queued'
  | 'running'
  | 'needs_ocr'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'partial_completed';

export type ParsingMode = 'auto' | 'text_only' | 'ocr_only' | 'hybrid';

export type DocumentType = 'quote' | 'boq' | 'spec' | 'drawing' | 'report' | 'invoice' | 'other';

export interface Citation {
  page: number;
  lineStart: number;
  lineEnd: number;
}

export interface PageData {
  page: number;
  method: 'text' | 'ocr' | 'none';
  confidence: number;
  text: string;
  lines: Array<{ line: number; text: string }>;
  errors: string[];
}

export interface ArtifactPack {
  jobId: string;
  documentId: string;
  source: {
    bucket: string;
    path: string;
  };
  pageCount: number;
  pages: PageData[];
  lowConfidencePages: number[];
  errors: Array<{
    code: string;
    message: string;
  }>;
  createdAt: string;
}

export interface ValueWithCitation {
  value: number;
  citation: Citation | null;
}

export interface LineItem {
  description: string;
  quantity: string | null;
  unit: string | null;
  rate: string | null;
  amount: string | null;
  citations: Citation[];
  confidence: number;
  needsReview: boolean;
}

export interface Term {
  key: string;
  value: string;
  citations: Citation[];
}

export interface Exclusion {
  text: string;
  citations: Citation[];
}

export interface Warning {
  code: string;
  message: string;
  pages: number[];
}

export interface ParsedResult {
  documentType: DocumentType;
  title: string | null;
  parties: {
    issuer: string | null;
    recipient: string | null;
  };
  dates: {
    issueDate: string | null;
    validUntil: string | null;
  };
  currency: string | null;
  totals: {
    subtotal: ValueWithCitation;
    gst: ValueWithCitation;
    total: ValueWithCitation;
  };
  lineItems: LineItem[];
  terms: Term[];
  exclusions: Exclusion[];
  warnings: Warning[];
  meta: {
    jobId: string;
    pageCount: number;
    parserVersion: string;
  };
}

export interface ParsingJob {
  id: string;
  project_id: string | null;
  document_id: string;
  drawing_id: string | null;
  status: ParsingJobStatus;
  mode: ParsingMode;
  priority: number;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number | null;
  attempt_count: number;
  max_attempts: number;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat_at: string | null;
  page_count: number | null;
  ocr_pages: number[] | null;
  text_pages: number[] | null;
  low_confidence_pages: number[] | null;
  artifact_json_path: string | null;
  result_json_path: string | null;
  error_code: string | null;
  error_message: string | null;
  debug: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ParsedDocument {
  id: string;
  parsing_job_id: string;
  document_id: string;
  title: string | null;
  doc_type: DocumentType | null;
  summary: string | null;
  result_json: ParsedResult | null;
  confidence_score: number | null;
  needs_review: boolean;
  created_at: string;
}

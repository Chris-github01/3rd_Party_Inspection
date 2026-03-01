# InspectPDF Technical Specification
## Comprehensive PDF Manipulation Tool for Fire Protection Inspection Workflow

**Version:** 1.0
**Date:** March 1, 2026
**Status:** Design Complete - Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Workflow Integration](#workflow-integration)
4. [Core Features Specification](#core-features-specification)
5. [API Design](#api-design)
6. [User Interface Design](#user-interface-design)
7. [Database Schema](#database-schema)
8. [Implementation Details](#implementation-details)
9. [Performance Optimization](#performance-optimization)
10. [Security Considerations](#security-considerations)
11. [Testing Strategy](#testing-strategy)
12. [Deployment & Migration](#deployment--migration)

---

## Executive Summary

### Purpose

InspectPDF is a comprehensive PDF manipulation tool designed to integrate seamlessly into the existing fire protection inspection workflow. It provides advanced PDF editing capabilities post-export, allowing users to refine, reorganize, and optimize generated inspection reports before final delivery to clients.

### Key Objectives

1. **Enhance Workflow Efficiency**: Eliminate need for external PDF tools
2. **Maintain Data Integrity**: All operations tracked and auditable
3. **Offline Processing**: Client-side PDF manipulation for security
4. **Professional Output**: High-quality PDF manipulation for client deliverables
5. **User-Friendly Interface**: Intuitive UI matching existing application design

### Strategic Value

- **Cost Savings**: Eliminate PDFsam Basic or Adobe Acrobat licenses
- **Workflow Integration**: Seamless transition from Exports to PDF editing
- **Quality Control**: Final document refinement before delivery
- **Audit Trail**: Complete history of PDF modifications
- **Client Satisfaction**: Professional, polished deliverables

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Exports   │  │ InspectPDF │  │  Preview   │            │
│  │    Tab     │─▶│  Workspace │─▶│   Panel    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │    PDF     │  │   Batch    │  │  History   │            │
│  │ Operations │  │ Processor  │  │  Manager   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Library Layer                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  pdf-lib   │  │   Canvas   │  │  IndexedDB │            │
│  │   (Main)   │  │  Renderer  │  │   Cache    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Persistence Layer                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Supabase  │  │  Storage   │  │   Local    │            │
│  │ PostgreSQL │  │  (Blobs)   │  │  Storage   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
InspectPDF Module
│
├── UI Components
│   ├── InspectPDFWorkspace.tsx      (Main interface)
│   ├── PDFPreviewPanel.tsx          (Preview with thumbnails)
│   ├── OperationPanel.tsx           (Tool selection)
│   ├── BatchProcessingModal.tsx     (Batch operations)
│   ├── HistoryPanel.tsx             (Undo/redo stack)
│   └── ProgressTracker.tsx          (Operation progress)
│
├── Core Libraries
│   ├── pdfOperations.ts             (Core PDF manipulation)
│   ├── pdfMerge.ts                  (Merge functionality)
│   ├── pdfSplit.ts                  (Split functionality)
│   ├── pdfRotate.ts                 (Rotation operations)
│   ├── pdfExtract.ts                (Page extraction)
│   ├── pdfMix.ts                    (Mix/alternate pages)
│   └── pdfInsert.ts                 (Insert pages)
│
├── Utilities
│   ├── pdfValidator.ts              (PDF validation)
│   ├── pdfThumbnail.ts              (Thumbnail generation)
│   ├── pdfMetadata.ts               (Metadata handling)
│   ├── pdfOptimizer.ts              (Size optimization)
│   └── pdfCache.ts                  (Caching system)
│
└── State Management
    ├── usePDFWorkspace.ts           (Workspace state hook)
    ├── useOperationHistory.ts       (Undo/redo hook)
    └── useBatchProcessor.ts         (Batch processing hook)
```

---

## Workflow Integration

### Integration Point: Post-Exports Stage

InspectPDF integrates immediately after the Exports tab, creating a seamless workflow:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Exports    │────▶│  InspectPDF  │────▶│   Preview    │────▶│   Download   │
│  Tab (PDF    │     │  (Edit &     │     │  & Quality   │     │   or Save    │
│  Generation) │     │   Refine)    │     │   Check)     │     │   to Cloud   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### User Journey

1. **Generate Report**: User creates PDF in Exports tab
   - Base inspection report
   - Merged audit pack
   - Photo report (standard or enhanced)

2. **Enter InspectPDF**: Click "Edit in InspectPDF" button
   - PDF loaded into workspace
   - Thumbnail preview generated
   - Operations panel activated

3. **Perform Operations**: User manipulates PDF
   - Merge additional documents
   - Remove unnecessary pages
   - Rotate misoriented pages
   - Extract specific sections
   - Reorder pages

4. **Review & Save**: Final quality check
   - Preview full document
   - Verify page order
   - Check file size
   - Save or download

### Navigation Flow

```
Project Detail Page
│
├─── Documents Tab
├─── Inspections Tab
├─── Members Tab
├─── Loading Schedule Tab
├─── Site Manager Tab
├─── Pin Corrections Tab
├─── Exports Tab
│    │
│    ├─── Generate Base Report ──┐
│    ├─── Generate Merged Pack ──┤
│    ├─── Generate Photo Report ─┤
│    └─── Generate Enhanced ──────┤
│                                 │
│                                 ▼
└─── InspectPDF Tab ◀────── [Edit in InspectPDF]
     │
     ├─── Workspace (Main editing area)
     ├─── Operations (Tool palette)
     ├─── Preview (Page thumbnails)
     └─── History (Undo/redo)
```

---

## Core Features Specification

### 1. Merge PDFs

**Description**: Combine multiple PDF documents into a single file with advanced page selection.

**User Stories**:
- As an inspector, I want to merge the base report with additional appendices
- As a project manager, I want to combine multiple project reports into one deliverable
- As a quality manager, I want to merge related inspection documents

**Functionality**:
```typescript
interface MergeOptions {
  sources: PDFSource[];
  outputFilename: string;
  preserveBookmarks?: boolean;
  preserveMetadata?: boolean;
  addTableOfContents?: boolean;
}

interface PDFSource {
  file: File | Blob | ArrayBuffer;
  pageRanges?: PageRange[];  // e.g., "1-10, 14, 25-"
  filename: string;
}

interface PageRange {
  start: number;
  end?: number;  // undefined = to end
}
```

**Page Range Syntax**:
- `1-10`: Pages 1 through 10
- `14`: Only page 14
- `25-`: Page 25 to end of document
- `1,3,5,7`: Specific pages only
- `-5`: First 5 pages
- `even`: All even pages
- `odd`: All odd pages

**UI Flow**:
1. Click "Merge PDFs" button
2. Upload/select multiple PDF files
3. For each file, specify page ranges (optional)
4. Drag to reorder files
5. Preview merged result
6. Execute merge operation

**Algorithm**:
```
1. Validate all source PDFs
2. Parse page ranges for each source
3. Create new PDFDocument
4. For each source:
   a. Load source PDF
   b. Extract specified pages
   c. Copy pages to new document
   d. Preserve metadata if requested
5. Optimize resulting document
6. Return merged PDF
```

**Performance Considerations**:
- Stream large PDFs to avoid memory issues
- Use worker threads for parsing
- Progress updates every 10 pages
- Cancel operation support

---

### 2. Split PDFs

**Description**: Divide a single PDF into multiple documents using various splitting strategies.

**User Stories**:
- As an inspector, I want to split a large report into sections for different stakeholders
- As a document manager, I want to extract individual inspection sections
- As a client, I want to receive only relevant sections of the report

**Split Methods**:

#### A. Split by Page Numbers
```typescript
interface SplitByPagesOptions {
  source: PDFSource;
  splitPoints: number[];  // Page numbers where splits occur
  outputPattern: string;  // e.g., "{original}_part{n}.pdf"
}

// Example: Split at pages 5, 10, 15
// Creates: report_part1.pdf (p1-5), report_part2.pdf (p6-10), etc.
```

#### B. Split by Size
```typescript
interface SplitBySizeOptions {
  source: PDFSource;
  maxSizeMB: number;
  preservePages: boolean;  // Don't split in middle of page
  outputPattern: string;
}

// Example: Split into chunks of max 5MB each
```

#### C. Split by Bookmarks
```typescript
interface SplitByBookmarksOptions {
  source: PDFSource;
  bookmarkLevels: number[];  // Which levels trigger splits
  outputPattern: string;
}

// Example: Split at level 1 bookmarks (chapters)
```

#### D. Split Every N Pages
```typescript
interface SplitEveryNPagesOptions {
  source: PDFSource;
  pagesPerChunk: number;
  outputPattern: string;
}

// Example: Split every 10 pages
```

#### E. Extract Even/Odd Pages
```typescript
interface SplitEvenOddOptions {
  source: PDFSource;
  extractEven: boolean;
  extractOdd: boolean;
  separateFiles: boolean;  // true = 2 files, false = alternating
}

// Use case: Separate duplex scan into two documents
```

**UI Flow**:
1. Click "Split PDF" button
2. Select/upload PDF file
3. Choose split method from dropdown
4. Configure method-specific options
5. Preview split points/resulting files
6. Execute split operation
7. Download all resulting PDFs (ZIP if multiple)

**Algorithm (Split by Page Numbers)**:
```
1. Validate source PDF
2. Parse split points
3. Sort split points ascending
4. For each segment:
   a. Create new PDFDocument
   b. Copy pages in range
   c. Set metadata
   d. Generate filename
5. Return array of PDF documents
```

---

### 3. Rotate Pages

**Description**: Rotate specific pages or entire documents by 90°, 180°, or 270°.

**User Stories**:
- As an inspector, I want to rotate landscape pages to portrait orientation
- As a document preparer, I want to fix incorrectly scanned pages
- As a quality checker, I want to ensure all pages have correct orientation

**Functionality**:
```typescript
interface RotateOptions {
  source: PDFSource;
  pageRanges: PageRange[];  // Which pages to rotate
  degrees: 90 | 180 | 270 | -90 | -180 | -270;
  rotateAllPages?: boolean;
}

// Rotation directions:
// 90° = clockwise 90°
// -90° = counter-clockwise 90°
// 180° = upside down
```

**UI Flow**:
1. Click "Rotate Pages" button
2. Select PDF and view thumbnails
3. Select pages to rotate (shift-click, ctrl-click, "all")
4. Click rotation button (90° CW, 90° CCW, 180°)
5. See live preview update
6. Apply changes

**Visual Indicators**:
- Rotation arrows on thumbnails
- Original vs current orientation overlay
- Batch rotation counter

**Algorithm**:
```
1. Load source PDF
2. For each selected page:
   a. Get current rotation
   b. Calculate new rotation (mod 360)
   c. Set page rotation property
3. Save modified PDF
4. Update preview
```

---

### 4. Extract Pages

**Description**: Create new PDF documents from specific page selections.

**User Stories**:
- As an inspector, I want to extract only the executive summary for quick client review
- As a project manager, I want to create separate PDFs for each inspection section
- As an admin, I want to extract appendices into separate files

**Functionality**:
```typescript
interface ExtractOptions {
  source: PDFSource;
  extractions: ExtractionSpec[];
  deleteExtractedFromSource?: boolean;
}

interface ExtractionSpec {
  pageRanges: PageRange[];
  outputFilename: string;
  includeBookmarks?: boolean;
}
```

**UI Flow**:
1. Click "Extract Pages" button
2. Load PDF with thumbnail view
3. Select pages (individual or ranges)
4. Click "Extract to New PDF"
5. Name the extracted PDF
6. Option: Remove from original
7. Execute extraction

**Multi-Extraction Mode**:
- Define multiple extraction sets
- Extract all at once
- Download as ZIP bundle

**Algorithm**:
```
1. Load source PDF
2. For each extraction spec:
   a. Create new PDFDocument
   b. Copy specified pages
   c. Copy relevant bookmarks
   d. Set metadata
3. If deleteExtractedFromSource:
   a. Remove extracted pages from source
   b. Update source document
4. Return array of extracted PDFs + modified source
```

---

### 5. Mix PDFs

**Description**: Alternately merge pages from multiple documents.

**User Stories**:
- As a document preparer, I want to combine front and back scans from duplex scanning
- As an inspector, I want to interleave inspection photos with report pages
- As a trainer, I want to mix slides with notes pages

**Functionality**:
```typescript
interface MixOptions {
  sources: PDFSource[];
  pattern: MixPattern;
  outputFilename: string;
}

interface MixPattern {
  sequence: number[];  // e.g., [1,1,2,2,1] = 1 page from doc1, 1 from doc2, 2 from doc3, etc.
  repeat: boolean;     // Repeat pattern until all pages used
  handleUneven: 'skip' | 'append' | 'prepend';
}

// Example patterns:
// [1,1] = Alternate pages from 2 documents (1 from each)
// [2,1] = 2 pages from doc1, 1 from doc2, repeat
// [1,1,1] = Rotate through 3 documents
```

**UI Flow**:
1. Click "Mix PDFs" button
2. Upload/select multiple PDFs (2-10)
3. Choose mixing pattern or custom sequence
4. Preview first few pages showing mix pattern
5. Configure uneven page handling
6. Execute mix operation

**Common Patterns**:
- **Alternate**: 1 from each, repeat
- **2-1 Mix**: 2 from first, 1 from second
- **Interleave 3**: Rotate through 3 documents
- **Custom**: User-defined sequence

**Algorithm**:
```
1. Validate all source PDFs
2. Load all documents
3. Calculate total pages needed
4. Build page sequence based on pattern:
   a. Track current page for each source
   b. Follow pattern sequence
   c. Handle reaching end of sources
5. Create new PDFDocument
6. Copy pages in calculated sequence
7. Return mixed PDF
```

---

### 6. Insert Pages

**Description**: Repeatedly insert specific pages at defined intervals throughout a document.

**User Stories**:
- As a document preparer, I want to insert a disclaimer page before each section
- As a trainer, I want to insert blank note pages after each slide
- As an inspector, I want to insert section dividers at regular intervals

**Functionality**:
```typescript
interface InsertOptions {
  targetPDF: PDFSource;
  insertionPDF: PDFSource;
  insertionPages: PageRange[];  // Which pages from insertion PDF
  insertionPoints: InsertionPoint[];
  mode: 'before' | 'after' | 'replace';
}

interface InsertionPoint {
  type: 'interval' | 'specific' | 'bookmark' | 'pattern';
  value: number | number[] | string;
}

// Examples:
// Interval: Every 5 pages
// Specific: After pages [10, 20, 30]
// Bookmark: Before each level-1 bookmark
// Pattern: After pages matching criteria
```

**UI Flow**:
1. Click "Insert Pages" button
2. Select target PDF (main document)
3. Select/upload insertion PDF or use blank page
4. Choose pages to insert
5. Define insertion points:
   - Every N pages
   - Specific page numbers
   - Before/after bookmarks
6. Preview insertion points
7. Execute insertion

**Special Cases**:
- **Blank Pages**: Insert blank pages (useful for printing)
- **Divider Pages**: Insert styled divider pages
- **Repeated Content**: Insert same content multiple times
- **Conditional**: Insert based on page content detection

**Algorithm**:
```
1. Load target and insertion PDFs
2. Parse insertion points
3. Create new PDFDocument
4. Iterate through target pages:
   a. Copy target page
   b. Check if insertion point reached
   c. If yes, copy insertion pages
   d. Continue
5. Handle final pages
6. Return modified PDF
```

---

## API Design

### Core PDF Operations Interface

```typescript
// Main PDF Operations Class
class PDFOperations {
  // Merge multiple PDFs
  static async merge(options: MergeOptions): Promise<PDFResult>;

  // Split PDF by various methods
  static async split(options: SplitOptions): Promise<PDFResult[]>;

  // Rotate pages
  static async rotate(options: RotateOptions): Promise<PDFResult>;

  // Extract pages
  static async extract(options: ExtractOptions): Promise<PDFResult[]>;

  // Mix PDFs
  static async mix(options: MixOptions): Promise<PDFResult>;

  // Insert pages
  static async insert(options: InsertOptions): Promise<PDFResult>;

  // Batch processing
  static async batch(operations: Operation[]): Promise<BatchResult>;
}

// Result Types
interface PDFResult {
  success: boolean;
  data?: Uint8Array | Blob;
  metadata?: PDFMetadata;
  error?: Error;
  warnings?: string[];
  processingTime: number;
}

interface BatchResult {
  operations: OperationResult[];
  totalTime: number;
  successCount: number;
  failureCount: number;
}

interface OperationResult {
  operationType: string;
  success: boolean;
  result?: PDFResult;
  error?: Error;
}

// PDF Metadata
interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
  fileSize: number;
}

// Page Range Utilities
class PageRangeParser {
  static parse(range: string): number[];
  static validate(range: string, maxPage: number): boolean;
  static format(pages: number[]): string;
}

// Example usage:
// PageRangeParser.parse("1-5,10,15-20") → [1,2,3,4,5,10,15,16,17,18,19,20]
```

### Validation & Error Handling

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

class PDFValidator {
  // Validate PDF file
  static async validatePDF(file: File | Blob): Promise<ValidationResult>;

  // Validate page range
  static validatePageRange(range: string, maxPage: number): ValidationResult;

  // Validate operation options
  static validateOptions(operation: string, options: any): ValidationResult;

  // Check file size limits
  static checkFileSizeLimit(file: File | Blob, limitMB: number): boolean;

  // Check PDF version compatibility
  static checkPDFVersion(file: File | Blob): Promise<string>;
}

// Error Codes
enum PDFErrorCode {
  INVALID_PDF = 'INVALID_PDF',
  ENCRYPTED_PDF = 'ENCRYPTED_PDF',
  CORRUPTED_PDF = 'CORRUPTED_PDF',
  PAGE_OUT_OF_RANGE = 'PAGE_OUT_OF_RANGE',
  INVALID_PAGE_RANGE = 'INVALID_PAGE_RANGE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
  INSUFFICIENT_MEMORY = 'INSUFFICIENT_MEMORY',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
}
```

### Progress Tracking

```typescript
interface ProgressCallback {
  (progress: ProgressUpdate): void;
}

interface ProgressUpdate {
  stage: string;           // e.g., "Loading", "Processing", "Saving"
  progress: number;        // 0-100
  currentPage?: number;
  totalPages?: number;
  message?: string;
  canCancel: boolean;
}

// Enhanced operations with progress
class PDFOperationsWithProgress {
  static async merge(
    options: MergeOptions,
    onProgress?: ProgressCallback
  ): Promise<PDFResult>;

  static async split(
    options: SplitOptions,
    onProgress?: ProgressCallback
  ): Promise<PDFResult[]>;

  // Cancel token for long operations
  static createCancelToken(): CancelToken;
}

interface CancelToken {
  cancel(): void;
  isCancelled(): boolean;
}
```

---

## User Interface Design

### Main InspectPDF Workspace

```
┌─────────────────────────────────────────────────────────────────────────┐
│  InspectPDF Workspace                                    [?] [Settings] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  Operations       │  │           Document Preview                │  │
│  │                   │  │                                           │  │
│  │  [Merge PDFs]     │  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐         │  │
│  │  [Split PDF]      │  │  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ ...     │  │
│  │  [Rotate Pages]   │  │  └───┘ └───┘ └───┘ └───┘ └───┘         │  │
│  │  [Extract Pages]  │  │                                           │  │
│  │  [Mix PDFs]       │  │  Current Document: inspection_report.pdf │  │
│  │  [Insert Pages]   │  │  Pages: 45 | Size: 12.5 MB              │  │
│  │                   │  │                                           │  │
│  │  [Optimize PDF]   │  │  [Select All] [Deselect] [Rotate 90°]   │  │
│  │  [Add Metadata]   │  │  [Delete Selected] [Extract Selected]    │  │
│  │                   │  │                                           │  │
│  └───────────────────┘  └──────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  History: [← Undo] [Redo →]  [Clear History]                    │  │
│  │  • Merged 3 documents (2 min ago)                               │  │
│  │  • Rotated pages 5-10 by 90° (5 min ago)                        │  │
│  │  • Extracted pages 1-5 to executive_summary.pdf (10 min ago)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  [Save Document] [Save As...] [Download] [Back to Exports]             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Operation Modal: Merge PDFs

```
┌─────────────────────────────────────────────────────────────┐
│  Merge PDFs                                      [X] Close   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Documents to Merge:                                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. ≡ inspection_report.pdf        [Pages: All ▼]  │    │
│  │       45 pages, 12.5 MB           [Remove]        │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ 2. ≡ appendix_a_drawings.pdf      [Pages: 1-10 ▼] │    │
│  │       25 pages, 8.2 MB            [Remove]        │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ 3. ≡ appendix_b_photos.pdf        [Pages: All ▼]  │    │
│  │       30 pages, 15.7 MB           [Remove]        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [+ Add More PDFs]  [Upload Files]                         │
│                                                              │
│  Output Options:                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Filename: [merged_inspection_pack.pdf          ]    │  │
│  │                                                      │  │
│  │ ☑ Preserve bookmarks                                │  │
│  │ ☑ Optimize file size                                │  │
│  │ ☐ Add table of contents                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Preview: Total 100 pages, ~36.4 MB                        │
│                                                              │
│  [Cancel]                    [Merge Documents]              │
└─────────────────────────────────────────────────────────────┘
```

### Operation Modal: Split PDF

```
┌─────────────────────────────────────────────────────────────┐
│  Split PDF                                       [X] Close   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Source Document:                                           │
│  inspection_report.pdf (45 pages, 12.5 MB)                 │
│                                                              │
│  Split Method:                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ◉ By Page Numbers                                    │  │
│  │ ○ By File Size                                       │  │
│  │ ○ By Bookmarks                                       │  │
│  │ ○ Every N Pages                                      │  │
│  │ ○ Extract Even/Odd Pages                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Split Points (comma-separated page numbers):              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [5, 15, 25, 35                                    ]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Preview:                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Part 1: Pages 1-5 (1.4 MB)                        │  │
│  │ • Part 2: Pages 6-15 (2.8 MB)                       │  │
│  │ • Part 3: Pages 16-25 (2.9 MB)                      │  │
│  │ • Part 4: Pages 26-35 (2.7 MB)                      │  │
│  │ • Part 5: Pages 36-45 (2.7 MB)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Output Pattern:                                            │
│  [inspection_report_part{n}.pdf              ]             │
│                                                              │
│  [Cancel]                    [Split Document]               │
└─────────────────────────────────────────────────────────────┘
```

### Page Selection Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Select Pages                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Select All] [Deselect All] [Invert] [Select Range...]    │
│                                                              │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐               │
│  │✓1│ │ 2│ │✓3│ │✓4│ │✓5│ │ 6│ │✓7│ │ 8│ ...          │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘               │
│  [90] [90] [90] [90] [90] [90] [90] [90]                   │
│                                                              │
│  Selected: 4 pages                                          │
│                                                              │
│  Quick Actions:                                             │
│  [Rotate 90° CW] [Rotate 90° CCW] [Delete] [Extract]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Progress Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  Processing PDF                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Merging 3 documents...                                     │
│                                                              │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░  65%             │
│                                                              │
│  Stage: Processing document 2 of 3                          │
│  Page: 28 of 100                                            │
│  Estimated time remaining: 12 seconds                       │
│                                                              │
│  [Cancel Operation]                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables for InspectPDF Feature

```sql
-- PDF workspace sessions
CREATE TABLE pdf_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'export', 'upload', 'generated'
  source_reference VARCHAR(255), -- Reference to original export/document
  current_pdf_path TEXT, -- Storage path to current version
  original_pdf_path TEXT, -- Storage path to original version
  metadata JSONB, -- PDF metadata
  page_count INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now()
);

-- Operation history for undo/redo
CREATE TABLE pdf_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES pdf_workspaces(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL, -- 'merge', 'split', 'rotate', etc.
  operation_data JSONB NOT NULL, -- Complete operation parameters
  result_pdf_path TEXT, -- Where result was stored
  status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  can_undo BOOLEAN DEFAULT true,
  undo_operation_id UUID REFERENCES pdf_operations(id),
  sequence_number INTEGER NOT NULL -- For ordering operations
);

-- Batch processing jobs
CREATE TABLE pdf_batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES pdf_workspaces(id) ON DELETE CASCADE,
  job_name VARCHAR(255) NOT NULL,
  operations JSONB[] NOT NULL, -- Array of operation specs
  status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  current_operation INTEGER DEFAULT 0,
  total_operations INTEGER NOT NULL,
  results JSONB, -- Results of each operation
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- PDF thumbnails cache
CREATE TABLE pdf_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES pdf_workspaces(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  thumbnail_path TEXT NOT NULL, -- Storage path to thumbnail image
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, page_number)
);

-- User preferences for InspectPDF
CREATE TABLE pdf_user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_merge_options JSONB,
  default_split_options JSONB,
  thumbnail_size VARCHAR(20) DEFAULT 'medium', -- 'small', 'medium', 'large'
  auto_optimize BOOLEAN DEFAULT true,
  show_advanced_options BOOLEAN DEFAULT false,
  recent_operations JSONB[], -- Recent operation templates
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_pdf_workspaces_project ON pdf_workspaces(project_id);
CREATE INDEX idx_pdf_workspaces_user ON pdf_workspaces(user_id);
CREATE INDEX idx_pdf_operations_workspace ON pdf_operations(workspace_id);
CREATE INDEX idx_pdf_operations_sequence ON pdf_operations(workspace_id, sequence_number);
CREATE INDEX idx_pdf_batch_jobs_workspace ON pdf_batch_jobs(workspace_id);
CREATE INDEX idx_pdf_batch_jobs_status ON pdf_batch_jobs(status);
CREATE INDEX idx_pdf_thumbnails_workspace ON pdf_thumbnails(workspace_id);

-- Row Level Security
ALTER TABLE pdf_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own workspaces"
  ON pdf_workspaces FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own workspaces"
  ON pdf_workspaces FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workspaces"
  ON pdf_workspaces FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own workspaces"
  ON pdf_workspaces FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Similar policies for other tables...
CREATE POLICY "Users can view operations for own workspaces"
  ON pdf_operations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_operations.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

-- Storage buckets
-- Create bucket for PDF workspaces: 'pdf-workspaces'
-- Create bucket for PDF thumbnails: 'pdf-thumbnails'
```

### Storage Organization

```
Storage Bucket: pdf-workspaces
├── {project_id}/
│   ├── {workspace_id}/
│   │   ├── original.pdf
│   │   ├── current.pdf
│   │   ├── operations/
│   │   │   ├── {operation_id}_result.pdf
│   │   │   ├── {operation_id}_backup.pdf
│   │   │   └── ...
│   │   └── temp/
│   │       └── ... (temporary files during processing)
│   └── ...
└── ...

Storage Bucket: pdf-thumbnails
├── {workspace_id}/
│   ├── page_001.jpg
│   ├── page_002.jpg
│   ├── page_003.jpg
│   └── ...
└── ...
```

---

## Implementation Details

### Core Library: pdf-lib Integration

**Why pdf-lib?**
- Client-side PDF manipulation (no server needed)
- Comprehensive API for all required operations
- Active maintenance and community support
- Works in browser and Node.js
- No external dependencies
- MIT licensed

**Installation**:
```bash
npm install pdf-lib
```

**Basic Usage Examples**:

```typescript
import { PDFDocument, degrees } from 'pdf-lib';

// Load existing PDF
const existingPdfBytes = await file.arrayBuffer();
const pdfDoc = await PDFDocument.load(existingPdfBytes);

// Get page count
const pageCount = pdfDoc.getPageCount();

// Get specific page
const firstPage = pdfDoc.getPage(0);

// Rotate page
firstPage.setRotation(degrees(90));

// Create new PDF
const newPdfDoc = await PDFDocument.create();

// Copy pages from one PDF to another
const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
newPdfDoc.addPage(copiedPage);

// Save PDF
const pdfBytes = await newPdfDoc.save();
```

### Merge Implementation

```typescript
import { PDFDocument } from 'pdf-lib';

async function mergePDFs(options: MergeOptions): Promise<PDFResult> {
  const startTime = performance.now();

  try {
    // Create new document for merged result
    const mergedPdf = await PDFDocument.create();

    // Process each source
    for (const source of options.sources) {
      // Load source PDF
      const sourceBytes = await getBytes(source.file);
      const sourcePdf = await PDFDocument.load(sourceBytes);

      // Parse page ranges
      const pages = source.pageRanges
        ? parsePageRanges(source.pageRanges, sourcePdf.getPageCount())
        : Array.from({ length: sourcePdf.getPageCount() }, (_, i) => i);

      // Copy specified pages
      const copiedPages = await mergedPdf.copyPages(sourcePdf, pages);

      // Add pages to merged document
      copiedPages.forEach(page => mergedPdf.addPage(page));

      // Preserve bookmarks if requested
      if (options.preserveBookmarks) {
        // Copy bookmarks (outline tree)
        // Implementation depends on pdf-lib version
      }
    }

    // Set metadata
    if (options.preserveMetadata) {
      mergedPdf.setTitle(options.outputFilename.replace('.pdf', ''));
      mergedPdf.setCreator('InspectPDF');
      mergedPdf.setProducer('Fire Protection Inspection System');
      mergedPdf.setCreationDate(new Date());
    }

    // Save merged PDF
    const mergedBytes = await mergedPdf.save();

    return {
      success: true,
      data: mergedBytes,
      metadata: {
        pageCount: mergedPdf.getPageCount(),
        fileSize: mergedBytes.length,
        title: options.outputFilename,
      },
      processingTime: performance.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    };
  }
}

function parsePageRanges(ranges: PageRange[], maxPage: number): number[] {
  const pages: number[] = [];

  for (const range of ranges) {
    if (range.end === undefined) {
      // Open-ended range (e.g., "25-")
      for (let i = range.start; i <= maxPage; i++) {
        pages.push(i - 1); // pdf-lib uses 0-based indexing
      }
    } else {
      // Closed range (e.g., "1-10")
      for (let i = range.start; i <= range.end; i++) {
        if (i <= maxPage) {
          pages.push(i - 1);
        }
      }
    }
  }

  return pages;
}
```

### Split Implementation

```typescript
async function splitPDFByPages(options: SplitByPagesOptions): Promise<PDFResult[]> {
  const startTime = performance.now();
  const results: PDFResult[] = [];

  try {
    // Load source PDF
    const sourceBytes = await getBytes(options.source.file);
    const sourcePdf = await PDFDocument.load(sourceBytes);
    const totalPages = sourcePdf.getPageCount();

    // Validate split points
    const sortedSplits = [...options.splitPoints].sort((a, b) => a - b);

    // Define segments
    const segments: { start: number; end: number }[] = [];
    let currentStart = 0;

    for (const splitPoint of sortedSplits) {
      if (splitPoint > currentStart && splitPoint < totalPages) {
        segments.push({ start: currentStart, end: splitPoint - 1 });
        currentStart = splitPoint;
      }
    }

    // Add final segment
    segments.push({ start: currentStart, end: totalPages - 1 });

    // Create PDF for each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentPdf = await PDFDocument.create();

      // Copy pages in segment
      const pageIndices = Array.from(
        { length: segment.end - segment.start + 1 },
        (_, j) => segment.start + j
      );

      const copiedPages = await segmentPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach(page => segmentPdf.addPage(page));

      // Generate filename
      const filename = options.outputPattern
        .replace('{original}', options.source.filename.replace('.pdf', ''))
        .replace('{n}', (i + 1).toString());

      // Set metadata
      segmentPdf.setTitle(filename);
      segmentPdf.setCreator('InspectPDF');

      // Save segment
      const segmentBytes = await segmentPdf.save();

      results.push({
        success: true,
        data: segmentBytes,
        metadata: {
          pageCount: segmentPdf.getPageCount(),
          fileSize: segmentBytes.length,
          title: filename,
        },
        processingTime: 0, // Updated after all segments
      });
    }

    // Update processing time for all results
    const totalTime = performance.now() - startTime;
    results.forEach(r => r.processingTime = totalTime / results.length);

    return results;

  } catch (error) {
    return [{
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    }];
  }
}
```

### Rotate Implementation

```typescript
import { degrees } from 'pdf-lib';

async function rotatePDF(options: RotateOptions): Promise<PDFResult> {
  const startTime = performance.now();

  try {
    // Load source PDF
    const sourceBytes = await getBytes(options.source.file);
    const pdfDoc = await PDFDocument.load(sourceBytes);

    // Determine which pages to rotate
    const pagesToRotate = options.rotateAllPages
      ? Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i)
      : parsePageRanges(options.pageRanges, pdfDoc.getPageCount());

    // Rotate each page
    for (const pageIndex of pagesToRotate) {
      const page = pdfDoc.getPage(pageIndex);
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + options.degrees) % 360;
      page.setRotation(degrees(newRotation));
    }

    // Save modified PDF
    const rotatedBytes = await pdfDoc.save();

    return {
      success: true,
      data: rotatedBytes,
      metadata: {
        pageCount: pdfDoc.getPageCount(),
        fileSize: rotatedBytes.length,
      },
      processingTime: performance.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    };
  }
}
```

### Thumbnail Generation

```typescript
import { getDocument } from 'pdfjs-dist';

async function generateThumbnails(
  pdfBytes: Uint8Array,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult[]> {
  const {
    maxWidth = 150,
    maxHeight = 200,
    quality = 0.8,
    format = 'image/jpeg',
  } = options;

  const thumbnails: ThumbnailResult[] = [];

  try {
    // Load PDF with PDF.js
    const loadingTask = getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;

    // Generate thumbnail for each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });

      // Calculate scale to fit in thumbnail size
      const scale = Math.min(
        maxWidth / viewport.width,
        maxHeight / viewport.height
      );

      const scaledViewport = page.getViewport({ scale });

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');

      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Canvas to blob failed')),
          format,
          quality
        );
      });

      thumbnails.push({
        pageNumber: i,
        blob,
        width: canvas.width,
        height: canvas.height,
      });
    }

    return thumbnails;

  } catch (error) {
    throw new Error(`Thumbnail generation failed: ${error}`);
  }
}

interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: string;
}

interface ThumbnailResult {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
}
```

---

## Performance Optimization

### Memory Management

**Challenge**: Large PDFs can consume significant memory

**Solutions**:

1. **Streaming Processing**:
```typescript
// Don't load entire PDF into memory at once
// Process page-by-page for large documents

async function processLargePDF(file: File, pageProcessor: (page: PDFPage) => void) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  const pageCount = pdfDoc.getPageCount();
  const BATCH_SIZE = 10; // Process 10 pages at a time

  for (let i = 0; i < pageCount; i += BATCH_SIZE) {
    const batch = Math.min(BATCH_SIZE, pageCount - i);

    for (let j = 0; j < batch; j++) {
      const page = pdfDoc.getPage(i + j);
      await pageProcessor(page);
    }

    // Allow garbage collection between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

2. **Lazy Loading**:
```typescript
// Load thumbnails only when visible
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pageNumber = parseInt(entry.target.getAttribute('data-page') || '0');
        loadThumbnail(pageNumber);
      }
    });
  },
  { rootMargin: '100px' } // Start loading before visible
);
```

3. **Web Workers**:
```typescript
// Offload PDF processing to worker thread
// Main thread remains responsive

// pdfWorker.ts
self.onmessage = async (e) => {
  const { operation, data } = e.data;

  try {
    let result;
    switch (operation) {
      case 'merge':
        result = await mergePDFs(data);
        break;
      case 'split':
        result = await splitPDF(data);
        break;
      // ... other operations
    }

    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};

// Usage in main thread
const worker = new Worker('pdfWorker.ts');

worker.postMessage({
  operation: 'merge',
  data: mergeOptions
});

worker.onmessage = (e) => {
  if (e.data.success) {
    handleResult(e.data.result);
  } else {
    handleError(e.data.error);
  }
};
```

### Caching Strategy

**IndexedDB for Local Caching**:

```typescript
import { openDB, DBSchema } from 'idb';

interface PDFCacheDB extends DBSchema {
  thumbnails: {
    key: string; // `${workspaceId}_${pageNumber}`
    value: {
      blob: Blob;
      width: number;
      height: number;
      timestamp: number;
    };
  };
  operations: {
    key: string; // operation ID
    value: {
      result: Uint8Array;
      metadata: any;
      timestamp: number;
    };
  };
}

class PDFCache {
  private db: Promise<IDBDatabase>;

  constructor() {
    this.db = openDB<PDFCacheDB>('pdf-cache', 1, {
      upgrade(db) {
        db.createObjectStore('thumbnails');
        db.createObjectStore('operations');
      },
    });
  }

  async cacheThumbnail(workspaceId: string, pageNumber: number, thumbnail: ThumbnailResult) {
    const db = await this.db;
    const key = `${workspaceId}_${pageNumber}`;

    await db.put('thumbnails', {
      blob: thumbnail.blob,
      width: thumbnail.width,
      height: thumbnail.height,
      timestamp: Date.now(),
    }, key);
  }

  async getThumbnail(workspaceId: string, pageNumber: number): Promise<ThumbnailResult | null> {
    const db = await this.db;
    const key = `${workspaceId}_${pageNumber}`;
    const cached = await db.get('thumbnails', key);

    if (!cached) return null;

    // Check if cache is still fresh (24 hours)
    if (Date.now() - cached.timestamp > 24 * 60 * 60 * 1000) {
      await db.delete('thumbnails', key);
      return null;
    }

    return {
      pageNumber,
      blob: cached.blob,
      width: cached.width,
      height: cached.height,
    };
  }

  async clearOldCache(maxAgeDays: number = 7) {
    const db = await this.db;
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

    const tx = db.transaction('thumbnails', 'readwrite');
    const store = tx.objectStore('thumbnails');

    let cursor = await store.openCursor();
    while (cursor) {
      if (cursor.value.timestamp < cutoffTime) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
  }
}
```

### Performance Benchmarks

**Target Performance Metrics**:

| Operation | Small PDF (<5MB, <50 pages) | Medium PDF (5-20MB, 50-200 pages) | Large PDF (>20MB, >200 pages) |
|-----------|----------------------------|----------------------------------|-------------------------------|
| **Merge (2 docs)** | < 2 seconds | < 5 seconds | < 15 seconds |
| **Split (5 parts)** | < 2 seconds | < 5 seconds | < 15 seconds |
| **Rotate (all pages)** | < 1 second | < 3 seconds | < 10 seconds |
| **Extract (10 pages)** | < 1 second | < 2 seconds | < 5 seconds |
| **Generate thumbnails** | < 3 seconds | < 10 seconds | < 30 seconds |

**Optimization Techniques**:

1. **Thumbnail Generation**:
   - Only generate visible thumbnails initially
   - Generate remaining thumbnails in background
   - Cache all thumbnails in IndexedDB

2. **PDF Operations**:
   - Use Web Workers for CPU-intensive operations
   - Implement progress callbacks for user feedback
   - Allow cancellation of long-running operations

3. **File Handling**:
   - Stream large files when possible
   - Use ArrayBuffer views instead of copying data
   - Implement chunked uploading for very large files

---

## Security Considerations

### Client-Side Processing Benefits

**Why Client-Side?**
1. **Data Privacy**: PDFs never leave user's device
2. **Compliance**: No server storage of sensitive documents
3. **Speed**: No upload/download time
4. **Cost**: No server processing costs
5. **Offline**: Works without internet connection

### Security Best Practices

1. **PDF Validation**:
```typescript
async function validatePDFSecurity(file: File): Promise<SecurityCheckResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false,
    });

    // Check if PDF is encrypted
    const isEncrypted = pdfDoc.isEncrypted;

    // Check for JavaScript
    const hasJavaScript = await checkForJavaScript(pdfDoc);

    // Check for embedded files
    const hasEmbedded = await checkForEmbeddedFiles(pdfDoc);

    return {
      safe: !isEncrypted && !hasJavaScript,
      warnings: [
        ...(isEncrypted ? ['PDF is password-protected'] : []),
        ...(hasJavaScript ? ['PDF contains JavaScript'] : []),
        ...(hasEmbedded ? ['PDF has embedded files'] : []),
      ],
    };
  } catch (error) {
    return {
      safe: false,
      warnings: ['PDF validation failed: ' + error.message],
    };
  }
}
```

2. **File Size Limits**:
```typescript
const MAX_FILE_SIZE_MB = 100;
const MAX_TOTAL_SIZE_MB = 500;

function validateFileSizes(files: File[]): ValidationResult {
  const errors: string[] = [];

  // Check individual file sizes
  files.forEach((file, index) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      errors.push(`File ${index + 1} exceeds ${MAX_FILE_SIZE_MB}MB limit`);
    }
  });

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
    errors.push(`Total size exceeds ${MAX_TOTAL_SIZE_MB}MB limit`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}
```

3. **Content Sanitization**:
```typescript
async function sanitizePDF(pdfDoc: PDFDocument): Promise<PDFDocument> {
  // Remove JavaScript
  // Remove embedded files
  // Remove form fields if not needed
  // Strip metadata if sensitive

  const sanitized = await PDFDocument.create();
  const pages = await sanitized.copyPages(pdfDoc, pdfDoc.getPageIndices());
  pages.forEach(page => sanitized.addPage(page));

  // Set safe metadata
  sanitized.setCreator('InspectPDF');
  sanitized.setProducer('Fire Protection Inspection System');

  return sanitized;
}
```

4. **Storage Security**:
```sql
-- Row Level Security policies ensure users can only access their own workspaces
CREATE POLICY "Users can only access own workspaces"
  ON pdf_workspaces FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage bucket policies
CREATE POLICY "Users can upload to own workspace"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdf-workspaces' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects
      WHERE id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid()
      )
    )
  );
```

---

## Testing Strategy

### Unit Tests

```typescript
// pdfOperations.test.ts
import { describe, it, expect } from 'vitest';
import { mergePDFs, splitPDF, rotatePDF } from './pdfOperations';

describe('PDF Merge', () => {
  it('should merge two PDFs correctly', async () => {
    const pdf1 = await loadTestPDF('test1.pdf');
    const pdf2 = await loadTestPDF('test2.pdf');

    const result = await mergePDFs({
      sources: [
        { file: pdf1, filename: 'test1.pdf' },
        { file: pdf2, filename: 'test2.pdf' },
      ],
      outputFilename: 'merged.pdf',
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.pageCount).toBe(10); // 5 + 5 pages
  });

  it('should handle page ranges correctly', async () => {
    const pdf = await loadTestPDF('test.pdf'); // 10 pages

    const result = await mergePDFs({
      sources: [
        {
          file: pdf,
          filename: 'test.pdf',
          pageRanges: [{ start: 1, end: 5 }],
        },
      ],
      outputFilename: 'partial.pdf',
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.pageCount).toBe(5);
  });

  it('should handle invalid PDFs gracefully', async () => {
    const invalidFile = new Blob(['not a pdf'], { type: 'application/pdf' });

    const result = await mergePDFs({
      sources: [{ file: invalidFile, filename: 'invalid.pdf' }],
      outputFilename: 'merged.pdf',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('PDF Split', () => {
  it('should split by page numbers', async () => {
    const pdf = await loadTestPDF('test.pdf'); // 20 pages

    const results = await splitPDFByPages({
      source: { file: pdf, filename: 'test.pdf' },
      splitPoints: [5, 10, 15],
      outputPattern: 'test_part{n}.pdf',
    });

    expect(results.length).toBe(4); // 4 segments
    expect(results[0].metadata?.pageCount).toBe(5);
    expect(results[1].metadata?.pageCount).toBe(5);
    expect(results[2].metadata?.pageCount).toBe(5);
    expect(results[3].metadata?.pageCount).toBe(5);
  });
});

describe('Page Range Parser', () => {
  it('should parse simple ranges', () => {
    expect(parsePageRangeString('1-5')).toEqual([1, 2, 3, 4, 5]);
    expect(parsePageRangeString('10')).toEqual([10]);
    expect(parsePageRangeString('1,3,5')).toEqual([1, 3, 5]);
  });

  it('should parse open-ended ranges', () => {
    expect(parsePageRangeString('5-', 10)).toEqual([5, 6, 7, 8, 9, 10]);
    expect(parsePageRangeString('-5', 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should parse even/odd pages', () => {
    expect(parsePageRangeString('even', 10)).toEqual([2, 4, 6, 8, 10]);
    expect(parsePageRangeString('odd', 10)).toEqual([1, 3, 5, 7, 9]);
  });
});
```

### Integration Tests

```typescript
// InspectPDFWorkspace.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InspectPDFWorkspace } from './InspectPDFWorkspace';

describe('InspectPDF Workspace', () => {
  it('should load PDF and display thumbnails', async () => {
    const pdf = await loadTestPDF('test.pdf');

    render(<InspectPDFWorkspace initialPDF={pdf} />);

    await waitFor(() => {
      expect(screen.getByText(/10 pages/i)).toBeInTheDocument();
    });

    // Check thumbnails are rendered
    const thumbnails = screen.getAllByRole('img');
    expect(thumbnails.length).toBe(10);
  });

  it('should perform merge operation', async () => {
    render(<InspectPDFWorkspace />);

    // Click merge button
    fireEvent.click(screen.getByText(/Merge PDFs/i));

    // Upload files
    const fileInput = screen.getByLabelText(/upload files/i);
    const pdf1 = await loadTestPDF('test1.pdf');
    const pdf2 = await loadTestPDF('test2.pdf');

    fireEvent.change(fileInput, {
      target: { files: [pdf1, pdf2] },
    });

    // Execute merge
    fireEvent.click(screen.getByText(/Merge Documents/i));

    await waitFor(() => {
      expect(screen.getByText(/merge completed/i)).toBeInTheDocument();
    });
  });

  it('should support undo/redo operations', async () => {
    const pdf = await loadTestPDF('test.pdf');

    render(<InspectPDFWorkspace initialPDF={pdf} />);

    // Perform rotation
    const page1 = screen.getAllByRole('img')[0];
    fireEvent.click(page1);
    fireEvent.click(screen.getByText(/Rotate 90° CW/i));

    await waitFor(() => {
      expect(screen.getByText(/rotated/i)).toBeInTheDocument();
    });

    // Undo
    fireEvent.click(screen.getByText(/Undo/i));

    await waitFor(() => {
      expect(screen.queryByText(/rotated/i)).not.toBeInTheDocument();
    });

    // Redo
    fireEvent.click(screen.getByText(/Redo/i));

    await waitFor(() => {
      expect(screen.getByText(/rotated/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

```typescript
// inspectpdf.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test.describe('InspectPDF Workflow', () => {
  test('complete workflow from export to PDF editing', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to project
    await page.click('text=Projects');
    await page.click('text=Test Project');

    // Generate report
    await page.click('text=Exports');
    await page.click('text=Generate Base Report');

    await page.waitForSelector('text=Report generated successfully');

    // Open in InspectPDF
    await page.click('text=Edit in InspectPDF');

    // Wait for workspace to load
    await page.waitForSelector('text=InspectPDF Workspace');

    // Verify thumbnails loaded
    const thumbnails = await page.$$('img[alt="Page thumbnail"]');
    expect(thumbnails.length).toBeGreaterThan(0);

    // Perform merge operation
    await page.click('text=Merge PDFs');
    await page.setInputFiles('[type="file"]', ['test-attachment.pdf']);
    await page.click('text=Merge Documents');

    await page.waitForSelector('text=Merge completed');

    // Download result
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Download'),
    ]);

    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
```

### Performance Tests

```typescript
// performance.test.ts
import { performance } from 'perf_hooks';

describe('Performance Benchmarks', () => {
  it('should merge small PDFs in under 2 seconds', async () => {
    const pdf1 = await loadTestPDF('small1.pdf'); // 2 MB, 10 pages
    const pdf2 = await loadTestPDF('small2.pdf'); // 2 MB, 10 pages

    const start = performance.now();

    const result = await mergePDFs({
      sources: [
        { file: pdf1, filename: 'small1.pdf' },
        { file: pdf2, filename: 'small2.pdf' },
      ],
      outputFilename: 'merged.pdf',
    });

    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2000); // 2 seconds
  });

  it('should generate thumbnails for 50 pages in under 10 seconds', async () => {
    const pdf = await loadTestPDF('medium.pdf'); // 50 pages
    const arrayBuffer = await pdf.arrayBuffer();

    const start = performance.now();

    const thumbnails = await generateThumbnails(new Uint8Array(arrayBuffer));

    const duration = performance.now() - start;

    expect(thumbnails.length).toBe(50);
    expect(duration).toBeLessThan(10000); // 10 seconds
  });
});
```

---

## Deployment & Migration

### Migration Plan

**Phase 1: Database Setup (Week 1)**
```sql
-- Run migration to create InspectPDF tables
-- See Database Schema section for complete SQL
```

**Phase 2: Core Libraries (Week 2)**
```bash
# Install dependencies
npm install pdf-lib idb

# Implement core PDF operations
# - pdfOperations.ts
# - pdfMerge.ts
# - pdfSplit.ts
# - pdfRotate.ts
# - pdfExtract.ts
```

**Phase 3: UI Components (Week 3)**
```typescript
// Implement React components
// - InspectPDFWorkspace.tsx
// - PDFPreviewPanel.tsx
// - OperationPanel.tsx
// - HistoryPanel.tsx
```

**Phase 4: Integration (Week 4)**
```typescript
// Add navigation to InspectPDF from Exports tab
// Integrate with existing project workflow
// Add "Edit in InspectPDF" buttons
```

**Phase 5: Testing (Week 5)**
```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

**Phase 6: Beta Release (Week 6)**
```
- Deploy to staging environment
- Beta testing with select users
- Collect feedback
- Fix critical bugs
```

**Phase 7: Production Release (Week 7)**
```
- Deploy to production
- User training materials
- Monitor performance
- Gather user feedback
```

### Rollout Strategy

**Gradual Rollout**:
1. **Week 1-2**: Internal team only
2. **Week 3-4**: Beta users (10-20 power users)
3. **Week 5-6**: Soft launch (50% of users)
4. **Week 7+**: Full availability

**Feature Flags**:
```typescript
// Feature flag system
const FEATURES = {
  INSPECT_PDF_ENABLED: process.env.VITE_FEATURE_INSPECT_PDF === 'true',
  INSPECT_PDF_BETA: process.env.VITE_FEATURE_INSPECT_PDF_BETA === 'true',
};

// Conditional rendering
{FEATURES.INSPECT_PDF_ENABLED && (
  <Button onClick={openInspectPDF}>
    Edit in InspectPDF
  </Button>
)}
```

### Documentation

**User Guide Sections**:
1. Introduction to InspectPDF
2. Getting Started
3. Merge PDFs Tutorial
4. Split PDFs Tutorial
5. Rotate Pages Tutorial
6. Extract Pages Tutorial
7. Mix PDFs Tutorial
8. Insert Pages Tutorial
9. Batch Processing
10. Troubleshooting
11. FAQs

**Developer Documentation**:
1. Architecture Overview
2. API Reference
3. Database Schema
4. Component API
5. Testing Guide
6. Performance Guidelines
7. Security Best Practices

---

## Conclusion

InspectPDF represents a comprehensive PDF manipulation solution perfectly integrated into the fire protection inspection workflow. By implementing this specification, the system will provide:

**Benefits**:
- Eliminated dependency on external PDF tools
- Seamless workflow integration
- Enhanced document quality control
- Complete audit trail
- Improved client deliverables
- Cost savings on licenses
- Better user experience

**Next Steps**:
1. Review and approve technical specification
2. Begin Phase 1 implementation (Database setup)
3. Set up development environment
4. Create project timeline
5. Assign development resources
6. Begin coding

**Success Metrics**:
- 90%+ user adoption within 3 months
- <5% error rate in PDF operations
- Average operation time meets benchmarks
- Positive user feedback (>4.0/5.0 rating)
- Zero security incidents

This specification provides a complete blueprint for implementing InspectPDF. All components are designed to work together seamlessly while maintaining the high quality and security standards of the existing system.

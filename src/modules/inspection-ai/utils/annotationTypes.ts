export type AnnotationKind = 'arrow' | 'rect' | 'text';

export interface AnnotationBase {
  id: string;
  kind: AnnotationKind;
  color: string;
  pageNumber: number;
}

export interface ArrowAnnotation extends AnnotationBase {
  kind: 'arrow';
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface RectAnnotation extends AnnotationBase {
  kind: 'rect';
  x: number; y: number;
  w: number; h: number;
}

export interface TextAnnotation extends AnnotationBase {
  kind: 'text';
  x: number; y: number;
  text: string;
}

export type Annotation = ArrowAnnotation | RectAnnotation | TextAnnotation;

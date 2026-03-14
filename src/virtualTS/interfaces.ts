export interface TsMapping {
  exprId: number;
  tsStart: number;
  tsEnd: number;
}

export interface TemplateError {
  templateExpression: string;
  startPos: number | null;
  endPos: number | null;
  message: string;
}

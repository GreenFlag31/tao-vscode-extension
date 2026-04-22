export interface TsMapping {
  exprId: number;
  tsStart: number;
  tsEnd: number;
  srcStart: number;
  srcEnd: number;
}

export interface TemplateError {
  templateExpression: string;
  startPos: number;
  endPos: number;
  message: string;
}

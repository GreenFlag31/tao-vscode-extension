export interface TsMapping {
  exprId: number;
  tsStart: number;
  tsEnd: number;
  /** Only present for execute-tag mappings: offset of the identifier within the trimmed execute value */
  srcStart?: number;
  srcEnd?: number;
}

export interface TemplateError {
  templateExpression: string;
  startPos: number;
  endPos: number;
  message: string;
}

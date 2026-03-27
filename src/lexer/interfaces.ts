export type TagType = 'raw' | 'execute' | 'interpolate';

export interface TemplateData {
  id: number;
  type: TagType | null;
  value: string;
  line: number;
  startPos: number;
  endPos: number;
}

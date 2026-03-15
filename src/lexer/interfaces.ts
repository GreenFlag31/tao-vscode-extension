export type TagType = 'raw' | 'execute' | 'interpolate';

export interface TemplateData {
  id: number;
  type: TagType | null;
  value: string;
  line: number;
  startPos: number;
  endPos: number;
}

export interface Tags {
  /**
   * @default "<%"
   */
  opening: string;
  /**
   * @default "%>"
   */
  closing: string;
}

export interface Parse {
  /**
   * Which prefix to use for evaluation.
   * @default ""
   */
  exec: string;

  /**
   * Which prefix to use for interpolation.
   * @default "="
   */
  interpolate: string;

  /**
   * Which prefix to use for raw interpolation.
   * @default "~"
   */
  raw: string;
}

export interface Options {
  /**
   * The directory containing your template files.
   */
  views: string;
  /**
   * Exec, interpolate, and raw configuration.
   */
  parse: Parse;
  /**
   * Opening and closing tag configuration.
   */
  tags: Tags;
  /**
   * Provide the extension without a dot upfront.
   * @default "html"
   */
  extension: string;
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

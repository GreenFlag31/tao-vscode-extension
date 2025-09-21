import * as vscode from 'vscode';

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

export interface VariableData {
  name: string;
  type: string;
}

export interface HelperData {
  name: string;
  params: string;
}

export interface UserData {
  template: string;
  variables: VariableData[];
  helpers: HelperData[];
  lastUpdate: string;
}

export interface InitValues {
  exec: string;
  interpolate: string;
  raw: string;
  openingAndClosingEvaluation: string;
  openingAndClosingInterpolation: string;
  openingAndClosingRaw: string;
  closing: string;
  extension: string;
  openingWithEvaluation: string;
  openingWithInterpolate: string;
  openingWithRaw: string;
  opening: string;
  views: string;
}

export interface CompletionItemSnippetData {
  name: string;
  label: {
    label: string;
    detail: string;
    description: string;
  };
  insertText: string;
  documentation: string | vscode.MarkdownString;
  range?: vscode.Range;
  itemKind: ItemKind;
}

export type ItemKind =
  | vscode.CompletionItemKind.Snippet
  | vscode.CompletionItemKind.Function
  | vscode.CompletionItemKind.Variable;

export interface InitReturn {
  success: boolean;
  options: Options;
}

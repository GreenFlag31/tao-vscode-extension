import * as vscode from 'vscode';
import { values } from '../config/init-config.js';
import { TemplateData } from './interfaces.js';
import { templateLexer } from './lexer.js';
import { log } from 'console';

const templateTokens = new Map<string, TemplateData[]>();

function processTemplateDocument(document: vscode.TextDocument) {
  if (!document.fileName.endsWith(`.${values.extension}`)) {
    return;
  }

  const tokens = templateLexer(
    document.getText(),
    { opening: values.opening, closing: values.closing },
    { exec: values.exec, interpolate: values.interpolate, raw: values.raw },
  );

  if (templateTokens.has(document.uri.fsPath)) {
    templateTokens.delete(document.uri.fsPath);
  }

  templateTokens.set(document.uri.fsPath, tokens);
  log(`Processed template document: ${document.uri.fsPath}`, tokens);
}

function getTemplateTokens(fsPath: string): TemplateData[] {
  return templateTokens.get(fsPath) ?? [];
}

export { processTemplateDocument, getTemplateTokens, templateTokens };

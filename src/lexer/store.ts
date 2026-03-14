import * as vscode from 'vscode';
import { values } from '../config/init-config.js';
import { templateLexer } from './lexer.js';

function getTemplateTokens(document: vscode.TextDocument) {
  const tokens = templateLexer(
    document.getText(),
    { opening: values.opening, closing: values.closing },
    { exec: values.exec, interpolate: values.interpolate, raw: values.raw },
  );

  return tokens;
}

export { getTemplateTokens };

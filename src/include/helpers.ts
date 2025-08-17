import * as vscode from 'vscode';
import { getLineTextUntilPosition } from '../utils.js';

function isInFirstIncludeArgument(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  const text = getLineTextUntilPosition(document, position);
  return /include\(\s*["'][^"']*$/.test(text);
}

export { getLineTextUntilPosition, isInFirstIncludeArgument };

import * as vscode from 'vscode';
import { CompletionItemSnippetData } from './interfaces.js';
import { log } from 'console';

function getLineTextUntilPosition(document: vscode.TextDocument, position: vscode.Position) {
  const lineText = document.lineAt(position.line).text;
  const textBeforeCursor = lineText.substring(0, position.character);

  return textBeforeCursor;
}

function normalizeWindowsPath(path: string) {
  return path.replace(/\\/g, '/');
}

/**
 * Get the name of the file with windows path normalization.
 */
function getFileName(file: string) {
  return normalizeWindowsPath(file).split('/').at(-1) || '';
}

function createCompletionItemSnippet(...completionItems: CompletionItemSnippetData[]) {
  const itemsCollection: vscode.CompletionItem[] = [];

  for (const completionItem of completionItems) {
    const { insertText, documentation, name, label, range, itemKind } = completionItem;

    const newCompletionItem = new vscode.CompletionItem(name, itemKind);
    newCompletionItem.label = label;
    newCompletionItem.insertText = new vscode.SnippetString(insertText);
    newCompletionItem.documentation = documentation;
    newCompletionItem.range = range;

    itemsCollection.push(newCompletionItem);
  }

  return itemsCollection;
}

/**
 * Detects if the user's cursor is inside a given regex globally (there can be multiple occurrence on the same line).
 */
function isCursorInsideCompletionItemGlobal(
  document: vscode.TextDocument,
  position: vscode.Position,
  regex: RegExp
) {
  try {
    const lineText = document.lineAt(position.line).text;

    const cursor = position.character;
    const matches = [...lineText.matchAll(regex)];
    if (matches.length === 0) return false;

    for (const match of matches) {
      const [start = 0, end = 0] = match.indices?.[0] || [];
      if (cursor >= end) continue;

      // exclusive end
      const isInInterval = cursor >= start && cursor < end;
      if (isInInterval) return true;
    }

    return false;
  } catch (error) {
    log(error);
  }
}

/**
 * Escape special regular expression characters inside a string
 */
function escapeRegExp(string: string) {
  // $& means the whole matched string
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

export {
  getLineTextUntilPosition,
  getFileName,
  normalizeWindowsPath,
  createCompletionItemSnippet,
  escapeRegExp,
  isCursorInsideCompletionItemGlobal,
};

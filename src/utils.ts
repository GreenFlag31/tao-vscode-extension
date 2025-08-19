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
 * Do NOT suggest an item provider if cursor inside item.
 * Tested through item regex. Exclusive end index.
 */
function isCursorInsideCompletionItem(
  document: vscode.TextDocument,
  position: vscode.Position,
  regex: RegExp
) {
  const lineText = document.lineAt(position.line).text;
  const cursor = position.character;
  const indices = regex.exec(lineText)?.indices?.[0];
  if (!indices) return false;

  const [start, end] = indices;
  return cursor >= start && cursor < end;
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
  isCursorInsideCompletionItem,
  escapeRegExp,
};

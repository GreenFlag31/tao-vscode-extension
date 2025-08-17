import * as vscode from 'vscode';
import { CompletionItemSnippetData } from './interfaces.js';

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

export { getLineTextUntilPosition, getFileName, normalizeWindowsPath, createCompletionItemSnippet };

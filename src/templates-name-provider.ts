import * as vscode from 'vscode';
import { getLineTextUntilPosition } from './utils.js';
import { log } from 'console';
import { pathToFileURL } from 'url';

// Watcher pour actualiser si des fichiers HTML sont ajoutés/supprimés
// const watcher = vscode.workspace.createFileSystemWatcher('**/*.html');
// watcher.onDidCreate(refreshTemplateCache);
// watcher.onDidDelete(refreshTemplateCache);
// watcher.onDidChange(refreshTemplateCache);

// context.subscriptions.push(watcher);

function isInFirstIncludeArgument(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  const text = getLineTextUntilPosition(document, position);
  return /include\(\s*["'][^"']*$/.test(text);
}

function transformTemplatesNamesToCompletionItems(templatesNames: string[]) {
  return templatesNames.map((name) => {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.File);
    item.insertText = name;
    return item;
  });
}

async function getTemplatesFiles(extension: string) {
  const templatesNames: string[] = [];
  const completeTemplatesReferences: string[] = [];

  const templates = await vscode.workspace.findFiles(`**/*.${extension}`, '**/node_modules/**');

  for (const template of templates) {
    const { path, fsPath } = template;
    const templateName = getFileName(path);
    templatesNames.push(templateName);

    const completePath = pathToFileURL(fsPath).href;
    completeTemplatesReferences.push(path);
  }

  const templatesFiles = transformTemplatesNamesToCompletionItems(templatesNames);

  return { templatesFiles, completeTemplatesReferences };
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

function excludeCurrentFileFromTemplatePropositions(
  propositions: vscode.CompletionItem[],
  currentFile: string
) {
  const fileName = getFileName(currentFile);

  const propositionsFiltered = propositions.filter((proposition) => {
    return proposition.label !== fileName;
  });

  return propositionsFiltered;
}

export {
  isInFirstIncludeArgument,
  transformTemplatesNamesToCompletionItems,
  getFileName,
  excludeCurrentFileFromTemplatePropositions,
  getTemplatesFiles,
};

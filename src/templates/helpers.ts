import * as vscode from 'vscode';
import { getFileName } from '../utils.js';

let completeTemplatesPath: string[] = [];

function createTemplatesFilesWatcherForTemplatesFiles(extension: string) {
  const templatesFilesWatcher = vscode.workspace.createFileSystemWatcher(`**/*.${extension}`);
  templatesFilesWatcher.onDidCreate(() => getTemplatesFiles(extension));
  templatesFilesWatcher.onDidChange(() => getTemplatesFiles(extension));
  templatesFilesWatcher.onDidDelete(() => getTemplatesFiles(extension));

  return templatesFilesWatcher;
}

async function getTemplatesFiles(extension: string) {
  const completeTemplatesReferences: string[] = [];
  const templates = await vscode.workspace.findFiles(`**/*.${extension}`, '**/node_modules/**');

  for (const template of templates) {
    const { path } = template;

    completeTemplatesReferences.push(path);
  }

  completeTemplatesPath = completeTemplatesReferences;
}

function excludeCurrentFileFromTemplatePropositions(
  completeTemplatesPath: string[],
  currentFile: string
) {
  const fileName = getFileName(currentFile);

  const allOthersTemplates = completeTemplatesPath
    .map((template) => getFileName(template))
    .filter((template) => {
      return template !== fileName;
    });

  return allOthersTemplates;
}

function transformTemplatesNamesToCompletionItems(templates: string[]) {
  const completionTemplateItems: vscode.CompletionItem[] = [];

  for (const template of templates) {
    const item = new vscode.CompletionItem(template, vscode.CompletionItemKind.File);
    item.insertText = template;
    item.detail = ' available template';
    item.documentation = 'TAO';
    completionTemplateItems.push(item);
  }

  return completionTemplateItems;
}

function findTemplateAccordingToTheNameClicked(completeTemplatesPath: string[], word: string) {
  const getTemplatePath = completeTemplatesPath.find((path) => path.endsWith(word));

  return getTemplatePath;
}

function getTemplateNameFromTemplateInclude(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const wordRange = document.getWordRangeAtPosition(position, /["'`]([^"'`]+)["'`]/);
  const word = document.getText(wordRange).replace(/['"`]/g, '');

  return word;
}

export {
  excludeCurrentFileFromTemplatePropositions,
  getTemplatesFiles,
  createTemplatesFilesWatcherForTemplatesFiles,
  completeTemplatesPath,
  transformTemplatesNamesToCompletionItems,
  getTemplateNameFromTemplateInclude,
  findTemplateAccordingToTheNameClicked,
};

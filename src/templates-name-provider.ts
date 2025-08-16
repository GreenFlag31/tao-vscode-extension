import * as vscode from 'vscode';
import { getFileName } from './common-utils.js';
import { log } from 'console';
let completeTemplatesPath: string[] = [];

function createTemplatesFilesWatcher(extension: string) {
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

export {
  excludeCurrentFileFromTemplatePropositions,
  getTemplatesFiles,
  createTemplatesFilesWatcher,
  completeTemplatesPath,
};

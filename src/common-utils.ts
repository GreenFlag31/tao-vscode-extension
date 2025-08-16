import path from 'path';
import * as vscode from 'vscode';
import { readFile } from 'fs/promises';
import { UserData } from './interfaces.js';
// include function ends naturally with a ')'
// template name can contain any character
const INCLUDE = /include\(['"]?.*['"]?.*,?/;
const COMPLETE_INCLUDE = /include\(['"]?.*['"]?.*[^)]?$/;

function getLineTextUntilPosition(document: vscode.TextDocument, position: vscode.Position) {
  const lineText = document.lineAt(position.line).text;
  const textBeforeCursor = lineText.substring(0, position.character);

  return textBeforeCursor;
}

function isInFirstIncludeArgument(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  const text = getLineTextUntilPosition(document, position);
  return /include\(\s*["'][^"']*$/.test(text);
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

function getInjectedUserDataPath() {
  return path.join(
    vscode.workspace.workspaceFolders![0].uri.fsPath,
    '.vscode',
    'tao-user-data.json'
  );
}

async function getInjectedUserData(): Promise<UserData[] | undefined> {
  try {
    const filePath = getInjectedUserDataPath();
    const content = await readFile(filePath, 'utf-8');
    const userData = JSON.parse(content);
    const dataIsValid = validateInjectedUserData(userData);

    return dataIsValid ? userData : [];
  } catch (error) {
    vscode.window.showWarningMessage('No injected data found');
    return undefined;
  }
}

function validateInjectedUserData(userDatas: UserData[]) {
  if (!Array.isArray(userDatas) || userDatas.length === 0) return false;

  return true;
}

function getCurrentInjectedVariables(userDatas: UserData[] = [], templateName: string) {
  return userDatas.find((data) => data.template === templateName);
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

export {
  getLineTextUntilPosition,
  INCLUDE,
  COMPLETE_INCLUDE,
  findTemplateAccordingToTheNameClicked,
  getInjectedUserData,
  getCurrentInjectedVariables,
  isInFirstIncludeArgument,
  transformTemplatesNamesToCompletionItems,
  getInjectedUserDataPath,
  getFileName,
  normalizeWindowsPath,
};

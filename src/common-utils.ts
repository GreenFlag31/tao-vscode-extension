import { log } from 'console';
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

function findTemplateAccordingToTheNameClicked(
  completeTemplatesReferences: string[],
  word: string
) {
  const getTemplateReference = completeTemplatesReferences.find((reference) =>
    reference.endsWith(word)
  );

  return getTemplateReference;
}

async function getInjectedUserData(): Promise<UserData[] | undefined> {
  try {
    const filePath = path.join(
      vscode.workspace.workspaceFolders![0].uri.fsPath,
      '.vscode',
      'tao-user-data.json'
    );
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

export {
  getLineTextUntilPosition,
  INCLUDE,
  COMPLETE_INCLUDE,
  findTemplateAccordingToTheNameClicked,
  getInjectedUserData,
  getCurrentInjectedVariables,
};

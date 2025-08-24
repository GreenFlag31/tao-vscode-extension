import * as vscode from 'vscode';
import { readFile } from 'fs/promises';
import { UserData } from '../interfaces.js';
import path from 'path';
import { normalizeWindowsPath } from '../utils.js';

let injectedUserData: UserData[] = [];

function createInjectedDataWatcher() {
  const injectedDataWatcher = vscode.workspace.createFileSystemWatcher(
    `**/.vscode/tao-user-data.json`
  );
  injectedDataWatcher.onDidCreate(getInjectedUserData);
  injectedDataWatcher.onDidChange(getInjectedUserData);
  injectedDataWatcher.onDidDelete(getInjectedUserData);

  return injectedDataWatcher;
}

function getInjectedUserDataPath() {
  const workspaceIsOpened = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  // happens when vs code is opened without any active folder
  if (!workspaceIsOpened) throw new Error();

  return path.join(workspaceIsOpened, '.vscode', 'tao-user-data.json');
}

async function getInjectedUserData() {
  try {
    const filePath = getInjectedUserDataPath();
    const content = await readFile(filePath, 'utf-8');
    const userData = JSON.parse(content);
    const dataIsValid = validateInjectedUserData(userData);

    injectedUserData = dataIsValid ? userData : [];
  } catch (error) {
    injectedUserData = [];
  }
}

function validateInjectedUserData(userDatas: UserData[]): userDatas is UserData[] {
  if (!Array.isArray(userDatas) || userDatas.length === 0) return false;

  return true;
}

function getCurrentInjectedData(userDatas: UserData[] = [], templatePath: string) {
  const templatePathNormalized = normalizeWindowsPath(templatePath).toLowerCase();
  return userDatas.find((data) => data.template.toLowerCase() === templatePathNormalized);
}

export {
  getCurrentInjectedData,
  validateInjectedUserData,
  getInjectedUserData,
  getInjectedUserDataPath,
  injectedUserData,
  createInjectedDataWatcher,
};

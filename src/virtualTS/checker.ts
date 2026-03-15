import ts from 'typescript';
import * as vscode from 'vscode';
import path from 'path';
import { getWorkspaceFolder } from './helpers.js';

// Le fichier virtuel est placé à la racine du workspace utilisateur.
// Résolu lazily à chaque typeCheck car workspaceFolders peut être undefined au chargement du module.
const VIRTUAL_FILE_NAME = '__tao_virtual__.ts';
let version = 0;
let currentSource = '';

function getVirtualFileName(): string {
  return path.join(getWorkspaceFolder(), VIRTUAL_FILE_NAME);
}

const compilerOptions: ts.CompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  module: ts.ModuleKind.NodeNext,
  lib: ['lib.esnext.d.ts'],
};

const host: ts.LanguageServiceHost = {
  getCompilationSettings: () => compilerOptions,
  getScriptFileNames: () => [getVirtualFileName()],
  getScriptVersion: () => version.toString(),
  getScriptSnapshot: (name) => {
    const normalizedName = path.normalize(name).toLowerCase();
    const normalizedVirtual = path.normalize(getVirtualFileName()).toLowerCase();

    if (normalizedName === normalizedVirtual) {
      return ts.ScriptSnapshot.fromString(currentSource);
    }

    const text = ts.sys.readFile(name);
    if (text !== undefined) {
      return ts.ScriptSnapshot.fromString(text);
    }

    return undefined;
  },

  getCurrentDirectory: () => vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? process.cwd(),
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
};

const languageService = ts.createLanguageService(host);

function updateVirtualTs(source: string) {
  currentSource = source;
  version++;
}

function typeCheck(virtualTs: string) {
  currentSource = virtualTs;
  version++;

  return languageService.getSemanticDiagnostics(getVirtualFileName());
}

export { typeCheck, updateVirtualTs, languageService, getVirtualFileName, VIRTUAL_FILE_NAME };

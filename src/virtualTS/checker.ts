import ts from 'typescript';
import path from 'path';
import { getWorkspaceFolder } from './helpers.js';
import { VIRTUAL_FILE_NAME } from '../config/const.js';

// Le fichier virtuel est placé à la racine du workspace utilisateur.
// Résolu lazily à chaque typeCheck car workspaceFolders peut être undefined au chargement du module.
let version = 0;
let currentSource = '';

// Buffer pour les fichiers TS ouverts non-sauvegardés
const unsavedFiles = new Map<string, string>();

function setUnsavedFile(filePath: string, content: string) {
  unsavedFiles.set(path.normalize(filePath).toLowerCase(), content);
  version++;
}

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

    // Priorité au buffer non-sauvegardé s'il existe
    const unsaved = unsavedFiles.get(normalizedName);
    if (unsaved !== undefined) {
      return ts.ScriptSnapshot.fromString(unsaved);
    }

    const text = ts.sys.readFile(name);
    if (text !== undefined) {
      return ts.ScriptSnapshot.fromString(text);
    }

    return undefined;
  },

  getCurrentDirectory: () => getWorkspaceFolder(),
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

export {
  typeCheck,
  updateVirtualTs,
  languageService,
  getVirtualFileName,
  VIRTUAL_FILE_NAME,
  setUnsavedFile,
};

import * as vscode from 'vscode';
import { format, FormatOptions } from './formatter.js';
import { values } from '../config/init-config.js';

function getExtension(): string {
  return values?.extension ?? 'html';
}

function isFormatterEnabled(): boolean {
  return values?.format !== false;
}

function buildOptions(): FormatOptions {
  return values
    ? {
        opening: values.opening,
        closing: values.closing,
        interpolatePrefix: values.interpolate,
        rawPrefix: values.raw,
      }
    : {};
}

function getEdits(document: vscode.TextDocument): vscode.TextEdit[] {
  if (!isFormatterEnabled()) return [];

  const original = document.getText();
  const formatted = format(original, buildOptions());
  if (formatted === original) return [];

  const range = new vscode.Range(document.positionAt(0), document.positionAt(original.length));
  return [vscode.TextEdit.replace(range, formatted)];
}

/**
 * Returns disposables for:
 *  - the DocumentFormattingEditProvider (Format Document command)
 *  - a will-save listener (format on save)
 *
 * The document selector uses the file extension from tao.config.mjs so that
 * templates with a custom extension (e.g. .tao) are also formatted.
 */
export function createFormattingProvider(): vscode.Disposable[] {
  const ext = getExtension();
  const selector: vscode.DocumentSelector = { scheme: 'file', pattern: `**/*.${ext}` };

  const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(selector, {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      return getEdits(document);
    },
  });

  const formatOnSave = vscode.workspace.onWillSaveTextDocument((event) => {
    if (!event.document.fileName.endsWith(`.${getExtension()}`)) return;

    event.waitUntil(Promise.resolve(getEdits(event.document)));
  });

  return [formattingProvider, formatOnSave];
}

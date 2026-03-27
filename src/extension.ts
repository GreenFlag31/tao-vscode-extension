import * as vscode from 'vscode';
import {
  createTemplatesFilesWatcher,
  getTemplatesFiles,
  templateDiagnosticCollection,
} from './templates/helpers.js';
import { createInitOptionsWatcher, getInitValues, initProviders } from './config/init-config.js';
import { handleTypescript, tsDiagnosticCollection } from './virtualTS/helpers.js';
import { languageService, setUnsavedFile } from './virtualTS/checker.js';
import { createFormattingProvider } from './formatter/provider.js';

// This method is called when your extension is activated
async function activate(context: vscode.ExtensionContext) {
  let debounceTimer: NodeJS.Timeout | undefined;

  await getInitValues();
  const initOptionsWatcher = createInitOptionsWatcher();

  await getTemplatesFiles();
  const templatesFilesWatcher = createTemplatesFilesWatcher();

  const providers = initProviders();
  const formattingProvider = createFormattingProvider();

  // Lex all visible template files at startup
  for (const document of vscode.workspace.textDocuments) {
    await handleTypescript(document);
  }

  // Re-lex when switching to a template tab
  const onActiveEditorListener = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    await handleTypescript(editor?.document);
  });

  // usefull to get hover information, error diagnostics, etc. on the fly while editing a template file
  const onChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    clearTimeout(debounceTimer);

    if (event.document.languageId === 'typescript') {
      // Mettre à jour le buffer non-sauvegardé dans le LanguageService
      setUnsavedFile(event.document.fileName, event.document.getText());
      // Re-valider tous les templates ouverts qui pourraient dépendre de ce fichier TS
      debounceTimer = setTimeout(async () => {
        for (const doc of vscode.workspace.textDocuments) {
          await handleTypescript(doc);
        }
      }, 300);
    } else {
      debounceTimer = setTimeout(() => {
        handleTypescript(event.document);
      }, 300);
    }
  });

  context.subscriptions.push(
    ...providers,
    ...formattingProvider,
    ...(initOptionsWatcher ? [initOptionsWatcher] : []),
    ...(templatesFilesWatcher ? [templatesFilesWatcher] : []),
    onActiveEditorListener,
    onChangeListener,
    tsDiagnosticCollection,
    templateDiagnosticCollection,
    languageService,
  );
}

export { activate };

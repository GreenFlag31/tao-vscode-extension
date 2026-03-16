import * as vscode from 'vscode';
import { createTemplatesFilesWatcher, getTemplatesFiles } from './templates/helpers.js';
import { createInitOptionsWatcher, getInitValues, initProviders } from './config/init-config.js';
import { handleTypescript, tsDiagnosticCollection } from './virtualTS/helpers.js';

// This method is called when your extension is activated
async function activate(context: vscode.ExtensionContext) {
  let debounceTimer: NodeJS.Timeout | undefined;

  await getInitValues();
  const initOptionsWatcher = createInitOptionsWatcher();

  await getTemplatesFiles();
  const templatesFilesWatcher = createTemplatesFilesWatcher();

  const providers = initProviders();

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
    debounceTimer = setTimeout(() => handleTypescript(event.document), 1000);
  });

  context.subscriptions.push(
    ...providers,
    ...(initOptionsWatcher ? [initOptionsWatcher] : []),
    ...(templatesFilesWatcher ? [templatesFilesWatcher] : []),
    onActiveEditorListener,
    onChangeListener,
    tsDiagnosticCollection,
  );
}

export { activate };

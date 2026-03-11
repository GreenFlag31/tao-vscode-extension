import * as vscode from 'vscode';
import { createTemplatesFilesWatcher, getTemplatesFiles } from './templates/helpers.js';
import { createInitOptionsWatcher, getInitValues, initProviders } from './config/init-config.js';
import { processTemplateDocument } from './lexer/store.js';

// This method is called when your extension is activated
async function activate(context: vscode.ExtensionContext) {
  await getInitValues();
  const initOptionsWatcher = createInitOptionsWatcher();

  await getTemplatesFiles();
  const templatesFilesWatcher = createTemplatesFilesWatcher();

  const providers = initProviders();

  // Lex all visible template files at startup
  for (const document of vscode.workspace.textDocuments) {
    processTemplateDocument(document);
  }

  // Re-lex when switching to an already-opened template tab
  const onActiveEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!editor) return;

    processTemplateDocument(editor.document);
  });

  context.subscriptions.push(
    ...providers,
    initOptionsWatcher,
    templatesFilesWatcher,
    onActiveEditorListener,
  );
}

export { activate };

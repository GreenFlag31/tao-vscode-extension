import * as vscode from 'vscode';
import { createTemplatesFilesWatcher, getTemplatesFiles } from './templates/helpers.js';
import { createInjectedDataWatcher, getInjectedUserData } from './user-data/helpers.js';
import { createInitOptionsWatcher, getInitValues, initProviders } from './config/init-config.js';
import { log } from 'console';

// This method is called when your extension is activated
async function activate(context: vscode.ExtensionContext) {
  await getInitValues();
  const initOptionsWatcher = createInitOptionsWatcher();

  await getTemplatesFiles();
  const templatesFilesWatcher = createTemplatesFilesWatcher();

  await getInjectedUserData();
  const injectedDataWatcher = createInjectedDataWatcher();

  const providers = initProviders();

  context.subscriptions.push(
    ...providers,
    initOptionsWatcher,
    templatesFilesWatcher,
    injectedDataWatcher
  );
}

// This method is called when your extension is deactivated
function deactivate() {}

export { activate, deactivate };

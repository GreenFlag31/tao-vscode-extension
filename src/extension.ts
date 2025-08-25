import * as vscode from 'vscode';
import { createTemplatesFilesWatcher, getTemplatesFiles } from './templates/helpers.js';
import { createInjectedDataWatcher, getInjectedUserData } from './user-data/helpers.js';
import { createInitOptionsWatcher, getInitValues, initProviders } from './config/init-config.js';

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

export { activate };

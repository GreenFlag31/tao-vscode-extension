import * as vscode from 'vscode';
import {
  createTemplatesFilesWatcherForTemplatesFiles,
  getTemplatesFiles,
} from './templates/helpers.js';
import {
  createTemplatesFilesWatcherForInjectedData,
  getInjectedUserData,
} from './user-data/helpers.js';
import { getInjectedUserDataProvider } from './user-data/providers.js';
import {
  getForInWithTagsProvider,
  getForWithTagsProvider,
  getIfWithTagsProvider,
  getTagsProvider,
} from './tags/providers.js';
import { getIncludeProvider, getSignatureProvider } from './include/providers.js';
import {
  getHoverProvider,
  getTemplateLinkProvider,
  getTemplatesNameProvider,
} from './templates/providers.js';
import { createInitOptionsWatcher, getInitValues } from './config/init-config.js';

// This method is called when your extension is activated
export async function activate(context: vscode.ExtensionContext) {
  const values = await getInitValues();
  createInitOptionsWatcher();
  const { extension } = values;

  await getTemplatesFiles(extension);
  const templatesFilesWatcher = createTemplatesFilesWatcherForTemplatesFiles(extension);

  await getInjectedUserData();
  const injectedDataWatcher = createTemplatesFilesWatcherForInjectedData();

  const tagsProvider = getTagsProvider(values);

  const includeProvider = getIncludeProvider(values);

  const ifWithTagsProvider = getIfWithTagsProvider(values);

  const injectedUserDataProvider = getInjectedUserDataProvider(values);

  const forWithTagsProvider = getForWithTagsProvider(values);

  const forInWithTagsProvider = getForInWithTagsProvider(values);

  const forOfWithTagsProvider = getForInWithTagsProvider(values);

  const signatureProvider = getSignatureProvider(values);

  const templatesNameProvider = getTemplatesNameProvider(values);

  const templateLinkProvider = getTemplateLinkProvider(values);

  const hoverProvider = getHoverProvider(values);

  context.subscriptions.push(
    includeProvider,
    tagsProvider,
    signatureProvider,
    templatesNameProvider,
    templateLinkProvider,
    ifWithTagsProvider,
    forOfWithTagsProvider,
    forInWithTagsProvider,
    forWithTagsProvider,
    injectedUserDataProvider,
    templatesFilesWatcher,
    hoverProvider,
    injectedDataWatcher
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

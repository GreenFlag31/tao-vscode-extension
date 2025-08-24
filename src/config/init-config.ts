import * as vscode from 'vscode';
import { pathToFileURL } from 'node:url';
import { Options, InitValues, InitReturn } from '../interfaces.js';
import { DEFAULT_OPTIONS } from './const.js';
import {
  getHoverProvider,
  getTemplateLinkProvider,
  getTemplatesNameProvider,
} from '../templates/providers.js';
import { getIncludeProvider, getIncludeSignatureProvider } from '../include/providers.js';
import {
  getTagsProvider,
  getIfWithTagsProvider,
  getForWithTagsProvider,
  getForInWithTagsProvider,
  getForOfWithTagsProvider,
} from '../tags/providers.js';
import { getInjectedUserDataProvider } from '../user-data/providers.js';
import { log } from 'node:console';

let values: InitValues;

function createInitOptionsWatcher() {
  const initOptionsWatcher = vscode.workspace.createFileSystemWatcher(`**/tao.config.js`);

  initOptionsWatcher.onDidCreate(() => getInitValues());
  initOptionsWatcher.onDidChange(() => getInitValues('update'));
  initOptionsWatcher.onDidDelete(() => getInitValues());

  return initOptionsWatcher;
}

async function getInitOptions(): Promise<InitReturn> {
  const failedInit = { success: false, options: DEFAULT_OPTIONS };

  try {
    const options = await vscode.workspace.findFiles('**/tao.config.js', '**/node_modules/**');
    if (options.length === 0) return failedInit;
    if (options.length > 1) {
      vscode.window.showWarningMessage('Multiple TAO configuration files found');
      return failedInit;
    }

    // cache buster
    const configPath = pathToFileURL(options[0].fsPath).href + `?update=${Date.now()}`;
    const optionsParsed = await import(configPath);
    const configuration = optionsParsed.default;
    const isConfigurationValid = isAValidConfiguration(configuration);

    if (!isConfigurationValid) return failedInit;

    return { success: true, options: configuration };
  } catch (error) {
    return failedInit;
  }
}

function isAValidConfiguration(optionsProvided: Options): optionsProvided is Options {
  const parseOrTagsOption: (keyof Options)[] = ['parse', 'tags'];

  for (const option in DEFAULT_OPTIONS) {
    const opt = option as keyof Options;
    const defaultOptionValue = DEFAULT_OPTIONS[opt];
    const optionValueProvided = optionsProvided[opt];

    if (typeof defaultOptionValue !== typeof optionValueProvided) {
      vscode.window.showWarningMessage(`Invalid ${opt} option in TAO configuration file provided`);
      return false;
    }

    if (parseOrTagsOption.includes(opt)) {
      const defaultSubOptions = DEFAULT_OPTIONS[opt] as any;
      const providedSubOptions = optionsProvided[opt] as any;

      for (const key in defaultSubOptions) {
        if (typeof defaultSubOptions[key] !== typeof providedSubOptions[key]) {
          vscode.window.showWarningMessage(
            `Invalid ${key} ${option} option in TAO configuration file provided`
          );
          return false;
        }
      }
    }
  }

  return true;
}

async function getInitValues(typeUpdate: 'none' | 'update' = 'none') {
  const { success, options } = await getInitOptions();
  const { extension, parse, tags } = options;
  const { opening, closing } = tags;
  const { exec, interpolate, raw } = parse;

  const openingWithEvaluation = opening + exec;
  const openingAndClosingEvaluated = `${openingWithEvaluation} ${closing}`;

  const openingWithInterpolate = opening + interpolate;
  const openingAndClosingInterpolated = `${openingWithInterpolate} ${closing}`;

  const openingWithRaw = opening + raw;
  const openingAndClosingRaw = `${openingWithRaw} ${closing}`;

  if (success && typeUpdate === 'update') {
    vscode.window.showInformationMessage('✔️ Configuration successfully updated');
  }

  values = {
    openingAndClosingEvaluated,
    openingAndClosingInterpolated,
    openingAndClosingRaw,
    closing,
    extension,
    openingWithEvaluation,
    openingWithInterpolate,
    openingWithRaw,
    opening,
  };
}

function initProviders() {
  const tagsProvider = getTagsProvider();

  const includeProvider = getIncludeProvider();

  const ifWithTagsProvider = getIfWithTagsProvider();

  const injectedUserDataProvider = getInjectedUserDataProvider();

  const forWithTagsProvider = getForWithTagsProvider();

  const forInWithTagsProvider = getForInWithTagsProvider();

  const forOfWithTagsProvider = getForOfWithTagsProvider();

  const includeSignatureProvider = getIncludeSignatureProvider();

  const templatesNameProvider = getTemplatesNameProvider();

  const templateLinkProvider = getTemplateLinkProvider();

  const hoverProvider = getHoverProvider();

  return [
    tagsProvider,
    includeProvider,
    ifWithTagsProvider,
    injectedUserDataProvider,
    forWithTagsProvider,
    forInWithTagsProvider,
    forOfWithTagsProvider,
    includeSignatureProvider,
    templatesNameProvider,
    templateLinkProvider,
    hoverProvider,
  ];
}

export { getInitOptions, getInitValues, createInitOptionsWatcher, values, initProviders };

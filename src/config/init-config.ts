import * as vscode from 'vscode';
import { pathToFileURL } from 'node:url';
import { Options, InitValues, InitReturn } from '../interfaces.js';
import { DEFAULT_OPTIONS } from './const.js';
import {
  getTemplateLinkProvider,
  getTemplateNameHoverProvider,
  getTemplatesNameProvider,
} from '../templates/providers.js';
import {
  getIncludeHoverProvider,
  getIncludeProvider,
  getIncludeSignatureProvider,
} from '../include/providers.js';
import {
  getTagsProvider,
  getIfWithTagsProvider,
  getForWithTagsProvider,
  getForInWithTagsProvider,
  getForOfWithTagsProvider,
  getIncludeWithTagsProvider,
  getTagsHoverProvider,
} from '../tags/providers.js';
import { getInjectedUserDataProvider, getVariableHoverProvider } from '../user-data/providers.js';

let values: InitValues;

function createInitOptionsWatcher() {
  const initOptionsWatcher = vscode.workspace.createFileSystemWatcher(`**/tao.config.mjs`);

  initOptionsWatcher.onDidCreate(() => getInitValues());
  initOptionsWatcher.onDidChange(() => getInitValues('update'));
  initOptionsWatcher.onDidDelete(() => getInitValues());

  return initOptionsWatcher;
}

async function getInitOptions(): Promise<InitReturn> {
  const failedInit = { success: false, options: DEFAULT_OPTIONS };

  try {
    const options = await vscode.workspace.findFiles('**/tao.config.mjs', '**/node_modules/**');
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
  const { extension, parse, tags, views } = options;
  const { opening, closing } = tags;
  const { exec, interpolate, raw } = parse;

  const openingWithEvaluation = opening + exec;
  const openingAndClosingEvaluation = `${openingWithEvaluation} ${closing}`;

  const openingWithInterpolate = opening + interpolate;
  const openingAndClosingInterpolation = `${openingWithInterpolate} ${closing}`;

  const openingWithRaw = opening + raw;
  const openingAndClosingRaw = `${openingWithRaw} ${closing}`;

  if (success && typeUpdate === 'update') {
    vscode.window.showInformationMessage('✔️ Tao configuration successfully updated');
  }

  values = {
    openingAndClosingEvaluation,
    openingAndClosingInterpolation,
    openingAndClosingRaw,
    closing,
    extension,
    openingWithEvaluation,
    openingWithInterpolate,
    openingWithRaw,
    opening,
    views,
    exec,
    interpolate,
    raw,
  };
}

function initProviders() {
  const tagsProvider = getTagsProvider();

  const tagsHoverProvider = getTagsHoverProvider();

  const includeProvider = getIncludeProvider();

  const includeHoverProvider = getIncludeHoverProvider();

  const includeWithTagsProvider = getIncludeWithTagsProvider();

  const includeSignatureProvider = getIncludeSignatureProvider();

  const ifWithTagsProvider = getIfWithTagsProvider();

  const forWithTagsProvider = getForWithTagsProvider();

  const forOfWithTagsProvider = getForOfWithTagsProvider();

  const forInWithTagsProvider = getForInWithTagsProvider();

  const injectedUserDataProvider = getInjectedUserDataProvider();

  const variableHoverProvider = getVariableHoverProvider();

  const templatesNameProvider = getTemplatesNameProvider();

  const templateLinkProvider = getTemplateLinkProvider();

  const templateNamehoverProvider = getTemplateNameHoverProvider();

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
    templateNamehoverProvider,
    includeWithTagsProvider,
    tagsHoverProvider,
    includeHoverProvider,
    variableHoverProvider,
  ];
}

export { getInitOptions, getInitValues, createInitOptionsWatcher, values, initProviders };

import * as vscode from 'vscode';
import { pathToFileURL } from 'node:url';
import { Options, InitValues } from '../interfaces.js';
import { DEFAULT_OPTIONS } from './const.js';

function createInitOptionsWatcher() {
  const initOptionsWatcher = vscode.workspace.createFileSystemWatcher('**/tao.config.js');
  const message =
    'Change in config file detected, reload window (F1 - Reload Window) to see effects';

  initOptionsWatcher.onDidCreate(() => vscode.window.showInformationMessage(message));
  initOptionsWatcher.onDidChange(() => vscode.window.showInformationMessage(message));
  initOptionsWatcher.onDidDelete(() => vscode.window.showInformationMessage(message));

  return initOptionsWatcher;
}

// aussi un watcher pour le changement uniquement ?
async function getInitOptions() {
  try {
    const options = await vscode.workspace.findFiles('**/tao.config.js', '**/node_modules/**');
    if (options.length === 0) return DEFAULT_OPTIONS;
    if (options.length > 1) {
      vscode.window.showWarningMessage('Multiple TAO configuration files found');
      return DEFAULT_OPTIONS;
    }

    const configPath = pathToFileURL(options[0].fsPath).href;
    const optionsParsed = await import(configPath);
    const configuration = optionsParsed.default;
    const isConfigurationValid = isAValidConfiguration(configuration);

    return isConfigurationValid ? configuration : DEFAULT_OPTIONS;
  } catch (error) {
    return DEFAULT_OPTIONS;
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

async function getInitValues() {
  const { extension, parse, tags } = await getInitOptions();
  const { opening, closing } = tags;
  const { exec, interpolate, raw } = parse;

  const openingWithEvaluation = opening + exec;
  const openingAndClosingEvaluated = `${openingWithEvaluation} ${closing}`;

  const openingWithInterpolate = opening + interpolate;
  const openingAndClosingInterpolated = `${openingWithInterpolate} ${closing}`;

  const openingWithRaw = opening + raw;
  const openingAndClosingRaw = `${openingWithRaw} ${closing}`;

  const values: InitValues = {
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

  return values;
}

export { getInitOptions, getInitValues, createInitOptionsWatcher };

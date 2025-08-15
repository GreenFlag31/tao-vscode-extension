import * as vscode from 'vscode';
import { pathToFileURL } from 'node:url';
import { DEFAULT_OPTIONS } from './const.js';
import { Options } from './interfaces.js';

async function getInitOptions(): Promise<Options> {
  const options = await vscode.workspace.findFiles('**/tao.config.js');
  if (options.length === 0) return DEFAULT_OPTIONS;
  if (options.length > 1) {
    vscode.window.showWarningMessage('Multiple TAO configuration files found');
    return DEFAULT_OPTIONS;
  }

  // nécessaire?? prendre le path
  // ou remplacer par plus robuste ?? uri.fsPath
  const configPath = pathToFileURL(options[0].fsPath).href;
  const optionsParsed = await import(configPath);
  const configuration = optionsParsed.default;
  const isConfigurationValid = isAValidConfiguration(configuration);

  return isConfigurationValid ? configuration : DEFAULT_OPTIONS;
}

function isAValidConfiguration(optionsProvided: Options): boolean {
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
  const { extension, parse, tags, views } = await getInitOptions();
  const { opening, closing } = tags;
  const { exec, interpolate, raw } = parse;
  const openingWithEvaluation = opening + exec;
  const openingAndClosingEvaluated = `${openingWithEvaluation} ${closing}`;

  const openingWithInterpolate = opening + interpolate;
  const openingAndClosingInterpolated = `${openingWithInterpolate} ${closing}`;

  const openingWithRaw = opening + raw;
  const openingAndClosingRaw = `${openingWithRaw} ${closing}`;

  return {
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

export { getInitOptions, getInitValues };

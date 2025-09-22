import * as vscode from 'vscode';
import { createCompletionItemSnippet, escapeRegExp } from '../utils.js';
import { getCurrentInjectedData, injectedUserData } from './helpers.js';
import { CompletionItemSnippetData } from '../interfaces.js';
import { values } from '../config/init-config.js';

function getInjectedUserDataProvider() {
  const injectedUserDataProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const currentData = getCurrentInjectedData(injectedUserData, document.fileName);
        if (!currentData) return;

        const { variables, helpers } = currentData;
        const variablesAndHelpers: vscode.CompletionItem[] = [];

        for (const variable of variables) {
          const { name, type } = variable;
          const data: CompletionItemSnippetData = {
            name,
            insertText: name,
            label: {
              label: name,
              detail: ` injected variable (${type})`,
              description: 'TAO',
            },
            documentation: 'Local template variable',
            itemKind: vscode.CompletionItemKind.Variable,
          };

          const item = createCompletionItemSnippet(data);
          variablesAndHelpers.push(...item);
        }

        for (const helper of helpers) {
          const { name, params } = helper;
          const paramsNumber = params.split(',');
          const args: string[] = [];

          for (let i = 1; i < paramsNumber.length + 1; i++) {
            args.push('${' + i + '}');
          }

          const insertText = `${name}(${args.join(', ')})`;
          const data: CompletionItemSnippetData = {
            name,
            insertText,
            label: {
              label: name,
              detail: ` injected helper function`,
              description: 'TAO',
            },
            documentation: 'Template helper',
            itemKind: vscode.CompletionItemKind.Function,
          };

          const item = createCompletionItemSnippet(data);
          variablesAndHelpers.push(...item);
        }

        return variablesAndHelpers;
      },
    },
    // all letters as triggers
    'azertyuiopqsdfghjklmwxcvbn'
  );

  return injectedUserDataProvider;
}

function getVariableHoverProvider() {
  const hoverProvider = vscode.languages.registerHoverProvider(values.extension, {
    provideHover(document, position) {
      const currentData = getCurrentInjectedData(injectedUserData, document.fileName);
      if (!currentData) return;
      const { variables, helpers } = currentData;

      for (const variable of variables) {
        const { name, type } = variable;

        const nameEscaped = `\\b${escapeRegExp(name)}\\b`;
        const nameRegex = new RegExp(nameEscaped);
        const wordRangeName = document.getWordRangeAtPosition(position, nameRegex);
        if (!wordRangeName) continue;

        return new vscode.Hover(
          new vscode.MarkdownString(
            [
              '### Injected Variable',
              '',
              `**Name:** \`${name}\``,
              `**Type:** \`${type}\``,
              '',
              'Available in the current template context.',
            ].join('\n')
          )
        );
      }

      for (const helper of helpers) {
        const { name, params } = helper;

        const helperNameEscaped = `${escapeRegExp(name)}(\\.*)`;
        const nameRegex = new RegExp(helperNameEscaped);
        const wordRangeHelperName = document.getWordRangeAtPosition(position, nameRegex);
        if (!wordRangeHelperName) continue;

        return new vscode.Hover(
          new vscode.MarkdownString(
            [
              '### Injected Helper Function',
              '',
              `**Name:** \`${name}\``,
              `**Type:** \`Function\``,
              `**Params:** \`${params}\``,
              '',
              'Available in the current template context.',
            ].join('\n')
          )
        );
      }
    },
  });

  return hoverProvider;
}

export { getInjectedUserDataProvider, getVariableHoverProvider };

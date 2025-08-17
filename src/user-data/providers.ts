import * as vscode from 'vscode';
import { createCompletionItemSnippet, getFileName } from '../utils.js';
import { getCurrentInjectedData, injectedUserData } from './helpers.js';
import { CompletionItemSnippetData, InitValues } from '../interfaces.js';

function getInjectedUserDataProvider(values: InitValues) {
  const { extension } = values;

  const injectedUserDataProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const templateName = getFileName(document.fileName);
        const currentData = getCurrentInjectedData(injectedUserData, templateName);

        if (!currentData) return;

        const { variables, helpers } = currentData;
        const variablesAndHelpers: vscode.CompletionItem[] = [];

        for (const variable of variables) {
          const data: CompletionItemSnippetData = {
            name: variable,
            insertText: variable,
            label: {
              label: variable,
              detail: ` injected template variable (${typeof variable})`,
              description: 'TAO',
            },
            documentation: 'Local template variable',
            itemKind: vscode.CompletionItemKind.Variable,
          };

          const item = createCompletionItemSnippet(data);
          variablesAndHelpers.push(...item);
        }

        for (const helper of helpers) {
          const data: CompletionItemSnippetData = {
            name: helper,
            insertText: helper,
            label: {
              label: helper,
              detail: ` injected template helper function`,
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

export { getInjectedUserDataProvider };

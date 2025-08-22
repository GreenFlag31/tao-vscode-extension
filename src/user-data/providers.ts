import * as vscode from 'vscode';
import { createCompletionItemSnippet, getFileName } from '../utils.js';
import { getCurrentInjectedData, injectedUserData } from './helpers.js';
import { CompletionItemSnippetData } from '../interfaces.js';
import { values } from '../config/init-config.js';

function getInjectedUserDataProvider() {
  const injectedUserDataProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const templateName = getFileName(document.fileName);
        const currentData = getCurrentInjectedData(injectedUserData, templateName);

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
              detail: ` injected template variable (${type})`,
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
          const data: CompletionItemSnippetData = {
            name,
            insertText: name,
            label: {
              label: name,
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

import * as vscode from 'vscode';
import { createCompletionItemSnippet } from '../utils.js';
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

export { getInjectedUserDataProvider };

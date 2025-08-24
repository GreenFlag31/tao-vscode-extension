import * as vscode from 'vscode';
import {
  createCompletionItemSnippet,
  getLineTextUntilPosition,
  isCursorInsideCompletionItem,
} from '../utils.js';
import { CompletionItemSnippetData } from '../interfaces.js';
import { INCLUDE, WHOLE_INCLUDE } from '../config/const.js';
import { values } from '../config/init-config.js';
import { log } from 'console';

function getIncludeProvider() {
  const includeProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        // ne pas proposer si curseur est dans l'include
        if (isCursorInsideCompletionItem(document, position, WHOLE_INCLUDE)) {
          return undefined;
        }

        const includeItemData: CompletionItemSnippetData = {
          name: 'include',
          insertText: 'include("${1:template}", {${2}}, {${3}})',
          label: {
            label: 'include',
            detail: ' Tao template include function',
            description: 'TAO',
          },
          documentation: 'Insert an include function',
          itemKind: vscode.CompletionItemKind.Function,
        };

        const include = createCompletionItemSnippet(includeItemData);

        return include;
      },
    },
    'i'
  );

  return includeProvider;
}

function getIncludeSignatureProvider() {
  const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideSignatureHelp(document, position) {
        const textUpToCursor = getLineTextUntilPosition(document, position);

        // Regarde s'il y a un appel à include(...) avant le curseur
        const includeCall = INCLUDE.exec(textUpToCursor);
        const argText = includeCall ? includeCall[0] : '';
        const commaCount = (argText.match(/,/g) || []).length;

        const sig = new vscode.SignatureInformation(
          'include(template: string, data?: object, helper?: object)',
          'Includes a child template with optional context and helper functions.'
        );
        sig.parameters = [
          new vscode.ParameterInformation('template', 'Template name'),
          new vscode.ParameterInformation(
            'data',
            'Object containing local variables. Children inherit data from the parent component.'
          ),
          new vscode.ParameterInformation(
            'helper',
            'Object containing helper functions. Children inherit helper functions from the parent component.'
          ),
        ];
        const MAX_TWO_PARAM = sig.parameters.length - 1;

        const result = new vscode.SignatureHelp();
        // only add the signature if the word is complete
        result.signatures = includeCall ? [sig] : [];
        result.activeSignature = 0;
        // the current param of the signature
        result.activeParameter = Math.min(commaCount, MAX_TWO_PARAM);

        return result;
      },
    },
    '(',
    ','
  );

  return signatureProvider;
}

export { getIncludeProvider, getIncludeSignatureProvider };

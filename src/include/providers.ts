import * as vscode from 'vscode';
import {
  createCompletionItemSnippet,
  escapeRegExp,
  getLineTextUntilPosition,
  isCursorInsideCompletionItemGlobal,
} from '../utils.js';
import { CompletionItemSnippetData } from '../interfaces.js';
import { values } from '../config/init-config.js';

function getIncludeProvider() {
  const includeProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const WHOLE_INCLUDE = /include\([^)]*\)?/dg;
        if (isCursorInsideCompletionItemGlobal(document, position, WHOLE_INCLUDE)) {
          return undefined;
        }

        const includeItemData: CompletionItemSnippetData = {
          name: 'include',
          insertText: 'include("${1}")',
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
        // multiple include sur même ligne très peu probable
        const INCLUDE = /include\(['"`]?.*['"`]?.*,?/;

        const includeCall = INCLUDE.exec(textUpToCursor);
        if (!includeCall) return undefined;

        const argText = includeCall[0];
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

function getIncludeHoverProvider() {
  const hoverProvider = vscode.languages.registerHoverProvider(values.extension, {
    provideHover(document, position) {
      const includeRegex = new RegExp(/\binclude\b/);
      const wordRangeInclude = document.getWordRangeAtPosition(position, includeRegex);

      if (!wordRangeInclude) return undefined;

      return new vscode.Hover(
        new vscode.MarkdownString(
          [
            '### TAO `include` Function',
            '',
            '```ts',
            'render(template: string, data: Data = {}, helpers: Helpers = {}): string',
            '```',
            '',
            '**Includes** a child template inside the current template.',
            'Children automatically inherit `data` and `helpers` from the parent.',
            '',
            '**Example:**',
            '```html',
            '<!-- parent.html -->',
            '<h1><%= title %></h1>',
            "<div><%~ include('child.html', { subtitle: 'Hello' }) %></div>",
            '```',
            '',
            '```html',
            '<!-- child.html -->',
            '<h2><%= subtitle %></h2>',
            '```',
          ].join('\n')
        )
      );
    },
  });

  return hoverProvider;
}

export { getIncludeProvider, getIncludeSignatureProvider, getIncludeHoverProvider };

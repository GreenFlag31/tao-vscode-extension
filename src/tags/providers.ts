import * as vscode from 'vscode';
import {
  createCompletionItemSnippet,
  getLineTextUntilPosition,
  isCursorInsideCompletionItemGlobal,
} from '../utils.js';
import { CompletionItemSnippetData } from '../interfaces.js';
import { values } from '../config/init-config.js';

function getTagsProvider() {
  const tagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const text = getLineTextUntilPosition(document, position);

        const WHOLE_INCLUDE = /include\([^)]*\)?/dg;
        if (isCursorInsideCompletionItemGlobal(document, position, WHOLE_INCLUDE)) {
          return undefined;
        }

        const match = text.match(/<%?$/); // changer ici !!
        const replaceRange = match
          ? new vscode.Range(position.translate(0, -match[0].length), position)
          : new vscode.Range(position, position);

        const evalItemData: CompletionItemSnippetData = {
          name: values.openingAndClosingEvaluated,
          insertText: values.openingWithEvaluation + ' ${1} ' + values.closing,
          label: {
            label: values.openingAndClosingEvaluated,
            detail: ' Evaluation – JS execution',
            description: 'TAO',
          },
          documentation: 'Insert an evaluation tag',
          range: replaceRange,
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        const interpolationItemData: CompletionItemSnippetData = {
          name: values.openingAndClosingInterpolated,
          insertText: values.openingWithInterpolate + ' ${1} ' + values.closing,
          label: {
            label: values.openingAndClosingInterpolated,
            detail: ' Interpolation – escaped output',
            description: 'TAO',
          },
          documentation: 'Insert an interpolation tag',
          range: replaceRange,
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        const rawItemData: CompletionItemSnippetData = {
          name: values.openingAndClosingRaw,
          insertText: values.openingWithRaw + ' ${1} ' + values.closing,
          label: {
            label: values.openingAndClosingRaw,
            detail: ' Raw – unescaped HTML',
            description: 'TAO',
          },
          documentation: 'Insert an raw tag',
          range: replaceRange,
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        const items = createCompletionItemSnippet(evalItemData, interpolationItemData, rawItemData);
        return items;
      },
    },
    ...values.opening.split('')
  );

  return tagsProvider;
}

function getIfWithTagsProvider() {
  const ifWithTagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const WHOLE_INCLUDE = /include\([^)]*\)?/dg;
        if (isCursorInsideCompletionItemGlobal(document, position, WHOLE_INCLUDE)) {
          return undefined;
        }

        const insertText =
          values.openingWithEvaluation +
          ' if ( ${1} ) { ' +
          values.closing +
          '\n ${2} \n' +
          values.openingWithEvaluation +
          ' } ' +
          values.closing;

        const data: CompletionItemSnippetData = {
          name: 'ifWithTags',
          insertText,
          label: {
            label: 'if',
            detail: ' condition with tags',
            description: 'TAO',
          },
          documentation: 'Insert an If condition with tags',
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        return createCompletionItemSnippet(data);
      },
    },
    'ifWithTags'
  );

  return ifWithTagsProvider;
}

function getForWithTagsProvider() {
  const forWithTagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const WHOLE_INCLUDE = /include\([^)]*\)?/dg;
        if (isCursorInsideCompletionItemGlobal(document, position, WHOLE_INCLUDE)) {
          return undefined;
        }

        const insertTextFor =
          values.openingWithEvaluation +
          ' for (let ${1:index} = 0; ${1} < ${2:array}.length; ${1}++) { ' +
          values.closing +
          '\n  const ${3:element} = ${2}[${1}];\n' +
          '  ${4}\n' +
          values.openingWithEvaluation +
          ' } ' +
          values.closing;

        const fordata: CompletionItemSnippetData = {
          name: 'forWithTags',
          insertText: insertTextFor,
          label: {
            label: 'for',
            detail: ' loop with tags',
            description: 'TAO',
          },
          documentation: 'Insert a For loop with tags',
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        const forCompletionItem = createCompletionItemSnippet(fordata);

        return forCompletionItem;
      },
    },
    'forWithTags'
  );

  return forWithTagsProvider;
}

function getForInWithTagsProvider() {
  const forInWithTagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const WHOLE_INCLUDE = /include\([^)]*\)?/dg;
        if (isCursorInsideCompletionItemGlobal(document, position, WHOLE_INCLUDE)) {
          return undefined;
        }

        const insertTextforIn =
          values.openingWithEvaluation +
          ' for (const ${1:key} in ${2:object}) { ' +
          values.closing +
          '\n  if (${2}.hasOwnProperty(${1})) {\n' +
          '    ${3}\n' +
          '  }\n' +
          values.openingWithEvaluation +
          ' } ' +
          values.closing;

        const dataForIn: CompletionItemSnippetData = {
          name: 'forInWithTags',
          insertText: insertTextforIn,
          label: {
            label: 'for...in',
            detail: ' loop with tags',
            description: 'TAO',
          },
          documentation: 'Insert a For...in loop with tags',
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        const forInCompletionItem = createCompletionItemSnippet(dataForIn);

        return forInCompletionItem;
      },
    },
    'forInWithTags'
  );

  return forInWithTagsProvider;
}

function getForOfWithTagsProvider() {
  const forOfWithTagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const WHOLE_INCLUDE = /include\([^)]*\)?/dg;
        if (isCursorInsideCompletionItemGlobal(document, position, WHOLE_INCLUDE)) {
          return undefined;
        }

        const insertText =
          values.openingWithEvaluation +
          ' for (const ${1:element} of ${2:array}) { ' +
          values.closing +
          '\n  ${3}\n' +
          values.openingWithEvaluation +
          ' } ' +
          values.closing;

        const data: CompletionItemSnippetData = {
          name: 'forOfWithTags',
          insertText,
          label: {
            label: 'for...of',
            detail: ' loop with tags',
            description: 'TAO',
          },
          documentation: 'Insert a For...of loop with tags',
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        return createCompletionItemSnippet(data);
      },
    },
    'forOfWithTags'
  );

  return forOfWithTagsProvider;
}

export {
  getTagsProvider,
  getIfWithTagsProvider,
  getForWithTagsProvider,
  getForOfWithTagsProvider,
  getForInWithTagsProvider,
};

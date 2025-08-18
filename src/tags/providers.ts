import * as vscode from 'vscode';
import {
  createCompletionItemSnippet,
  getLineTextUntilPosition,
  isCursorInsideCompletionItem,
} from '../utils.js';
import { CompletionItemSnippetData, InitValues } from '../interfaces.js';
import { WHOLE_INCLUDE } from '../config/const.js';

function getTagsProvider(values: InitValues) {
  const {
    extension,
    closing,
    openingAndClosingEvaluated,
    openingAndClosingInterpolated,
    openingAndClosingRaw,
    openingWithEvaluation,
    openingWithInterpolate,
    openingWithRaw,
    opening,
  } = values;

  const tagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const text = getLineTextUntilPosition(document, position);

        // ne pas proposer si dans un tag
        // +

        // ne pas proposer si curseur est dans l'include
        if (isCursorInsideCompletionItem(document, position, WHOLE_INCLUDE)) {
          return undefined;
        }

        const match = text.match(/<%?$/);
        const replaceRange = match
          ? new vscode.Range(position.translate(0, -match[0].length), position)
          : new vscode.Range(position, position);

        const evalItemData: CompletionItemSnippetData = {
          name: openingAndClosingEvaluated,
          insertText: openingWithEvaluation + ' ${1} ' + closing,
          label: {
            label: openingAndClosingEvaluated,
            detail: ' Evaluation – JS execution',
            description: 'TAO',
          },
          documentation: 'Insert an evaluation tag',
          range: replaceRange,
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        const interpolationItemData: CompletionItemSnippetData = {
          name: openingAndClosingInterpolated,
          insertText: openingWithInterpolate + ' ${1} ' + closing,
          label: {
            label: openingAndClosingInterpolated,
            detail: ' Interpolation – escaped output',
            description: 'TAO',
          },
          documentation: 'Insert an interpolation tag',
          range: replaceRange,
          itemKind: vscode.CompletionItemKind.Snippet,
        };

        const rawItemData: CompletionItemSnippetData = {
          name: openingAndClosingRaw,
          insertText: openingWithRaw + ' ${1} ' + closing,
          label: {
            label: openingAndClosingRaw,
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
    ...opening.split('')
  );

  return tagsProvider;
}

function getIfWithTagsProvider(values: InitValues) {
  const { extension, closing, openingWithEvaluation } = values;

  const ifWithTagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const insertText =
          openingWithEvaluation +
          ' if ( ${1} ) { ' +
          closing +
          '\n ${2} \n' +
          openingWithEvaluation +
          ' } ' +
          closing;

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

function getForWithTagsProvider(values: InitValues) {
  const { extension, closing, openingWithEvaluation } = values;

  const forWithTagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const insertTextFor =
          openingWithEvaluation +
          ' for (let ${1:index} = 0; ${1} < ${2:array}.length; ${1}++) { ' +
          closing +
          '\n  const ${3:element} = ${2}[${1}];\n' +
          '  ${4}\n' +
          openingWithEvaluation +
          ' } ' +
          closing;

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

function getForInWithTagsProvider(values: InitValues) {
  const { extension, closing, openingWithEvaluation } = values;

  const forInWithTagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const insertTextforIn =
          openingWithEvaluation +
          ' for (const ${1:key} in ${2:object}) { ' +
          closing +
          '\n  if (${2}.hasOwnProperty(${1})) {\n' +
          '    ${3}\n' +
          '  }\n' +
          openingWithEvaluation +
          ' } ' +
          closing;

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

function getForOfWithTagsProvider(values: InitValues) {
  const { extension, closing, openingWithEvaluation } = values;

  const forOfWithTagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const insertText =
          openingWithEvaluation +
          ' for (const ${1:element} of ${2:array}) { ' +
          closing +
          '\n  ${3}\n' +
          openingWithEvaluation +
          ' } ' +
          closing;

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

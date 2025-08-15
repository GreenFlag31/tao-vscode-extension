import * as vscode from 'vscode';
import {
  excludeCurrentFileFromTemplatePropositions,
  getFileName,
  getTemplatesFiles,
  isInFirstIncludeArgument,
} from './templates-name-provider.js';
import {
  COMPLETE_INCLUDE,
  INCLUDE,
  findTemplateAccordingToTheNameClicked,
  getCurrentInjectedVariables,
  getInjectedUserData,
  getLineTextUntilPosition,
} from './common-utils.js';
import { getInitValues } from './init-config.js';
import { log } from 'node:console';
import { CompletionItemSnippetData, createCompletionItemSnippet } from './provider-utils.js';

// This method is called when your extension is activated
export async function activate(context: vscode.ExtensionContext) {
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
  } = await getInitValues();
  const injectedUserData = await getInjectedUserData();
  log(injectedUserData);

  const tagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const text = getLineTextUntilPosition(document, position);

        // do not suggest if it does not end with < or <%
        if (!text.match(/<%?$/)) return undefined;

        // do not suggest tags inside an include
        if (COMPLETE_INCLUDE.test(text)) return undefined;

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

  const includeProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const text = getLineTextUntilPosition(document, position);

        // ne pas proposer un include dans un include
        if (COMPLETE_INCLUDE.test(text)) return undefined;

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

  const injectedUserDataProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const templateName = getFileName(document.fileName);

        const currentData = getCurrentInjectedVariables(injectedUserData, templateName);

        if (!currentData) return;

        // itérer sur tts les variables, helpers
        const { variables, helpers } = currentData;
        const variablesAndHelpers: vscode.CompletionItem[] = [];

        for (const variable of variables) {
          log('available variable', variable);

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
          log('available helper', helper);

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

  const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    { language: extension, scheme: 'file' },
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

  const { templatesFiles, completeTemplatesReferences } = await getTemplatesFiles(extension);
  // log(completeTemplatesReferences);

  const templatesNameProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        if (!isInFirstIncludeArgument(document, position)) return undefined;
        const templates = excludeCurrentFileFromTemplatePropositions(
          templatesFiles,
          document.fileName
        );

        return templates;
      },
    },
    '"',
    "'",
    '`'
  );

  const templateLinkProvider = vscode.languages.registerDefinitionProvider([extension], {
    provideDefinition(document, position) {
      const wordRange = document.getWordRangeAtPosition(position, /["'`]([^"'`]+)["'`]/);
      if (!wordRange) return;

      const word = document.getText(wordRange).replace(/['"`]/g, '');

      const reference = findTemplateAccordingToTheNameClicked(completeTemplatesReferences, word);

      log('word: ', word, 'and reference : ', reference);
      if (!reference) return undefined;

      return new vscode.Location(vscode.Uri.file(reference), new vscode.Position(0, 0));
    },
  });

  context.subscriptions.push(
    includeProvider,
    tagsProvider,
    signatureProvider,
    templatesNameProvider,
    templateLinkProvider,
    ifWithTagsProvider,
    forOfWithTagsProvider,
    forInWithTagsProvider,
    forWithTagsProvider,
    injectedUserDataProvider
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

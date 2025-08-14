import * as vscode from 'vscode';
import {
  excludeCurrentFileFromTemplatePropositions,
  getTemplatesFiles,
  isInFirstIncludeArgument,
} from './templates-name-provider.js';
import {
  COMPLETE_INCLUDE,
  INCLUDE,
  findTemplateAccordingToTheNameClicked,
  getLineTextUntilPosition,
} from './common-utils.js';
import { getInitValues } from './init-config.js';
import { log } from 'node:console';
import { CompletionItemData, createCompletionItemForSyntaxInTemplate } from './provider-utils.js';

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

  const tagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const text = getLineTextUntilPosition(document, position);

        // ne pas proposer si ça ne finit pas par < ou <%
        if (!text.match(/<%?$/)) {
          return undefined;
        }

        // ne pas proposer les tags dans un include
        if (COMPLETE_INCLUDE.test(text)) return undefined;

        const match = text.match(/<%?$/);
        const replaceRange = match
          ? new vscode.Range(position.translate(0, -match[0].length), position)
          : new vscode.Range(position, position); // fallback

        const evalItem = new vscode.CompletionItem(
          openingAndClosingEvaluated,
          vscode.CompletionItemKind.Snippet
        );
        evalItem.label = {
          label: openingAndClosingEvaluated,
          detail: ' Evaluation – JS execution',
        };
        evalItem.insertText = new vscode.SnippetString(openingWithEvaluation + ' ${1} ' + closing);
        evalItem.documentation = 'No escape – ideal for JS execution';
        evalItem.range = replaceRange;

        const interpItem = new vscode.CompletionItem(
          openingAndClosingInterpolated,
          vscode.CompletionItemKind.Snippet
        );
        interpItem.label = {
          label: openingAndClosingInterpolated,
          detail: ' Interpolation – escaped output',
        };
        interpItem.insertText = new vscode.SnippetString(
          openingWithInterpolate + ' ${1} ' + closing
        );
        interpItem.documentation = 'Escaped output – ideal for data interpolation';
        interpItem.range = replaceRange;

        const rawItem = new vscode.CompletionItem(
          openingAndClosingRaw,
          vscode.CompletionItemKind.Snippet
        );
        rawItem.label = { label: openingAndClosingRaw, detail: ' Raw – unescaped HTML' };
        rawItem.insertText = new vscode.SnippetString(openingWithRaw + ' ${1} ' + closing);
        rawItem.documentation = 'No escape – ideal for raw HTML inclusion';
        rawItem.range = replaceRange;

        return [evalItem, interpItem, rawItem];
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

        const item = new vscode.CompletionItem('include', vscode.CompletionItemKind.Function);
        item.detail = 'Tao template include function';
        item.documentation = 'Includes a child template with optional data and helpers.';
        item.insertText = new vscode.SnippetString('include("${1:template}", {${2}}, {${3}})');

        return [item];
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

        const data: CompletionItemData = {
          name: 'ifWithTags',
          insertText,
          label: {
            label: 'if',
            detail: ' condition with tags',
            description: 'TAO',
          },
          documentation: 'Insert an If condition with tags',
        };

        return createCompletionItemForSyntaxInTemplate(data);
      },
    },
    'ifWithTags'
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

        const fordata: CompletionItemData = {
          name: 'forWithTags',
          insertText: insertTextFor,
          label: {
            label: 'for',
            detail: ' loop with tags',
            description: 'TAO',
          },
          documentation: 'Insert a For loop with tags',
        };

        const forCompletionItem = createCompletionItemForSyntaxInTemplate(fordata);

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

        const dataForIn: CompletionItemData = {
          name: 'forInWithTags',
          insertText: insertTextforIn,
          label: {
            label: 'for...in',
            detail: ' loop with tags',
            description: 'TAO',
          },
          documentation: 'Insert a For...in loop with tags',
        };

        const forInCompletionItem = createCompletionItemForSyntaxInTemplate(dataForIn);

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

        const data: CompletionItemData = {
          name: 'forOfWithTags',
          insertText,
          label: {
            label: 'for...of',
            detail: ' loop with tags',
            description: 'TAO',
          },
          documentation: 'Insert a For...of loop with tags',
        };

        return createCompletionItemForSyntaxInTemplate(data);
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
    forWithTagsProvider
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

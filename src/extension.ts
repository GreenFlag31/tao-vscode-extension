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
} from './utils.js';
import { getInitOptions } from './init-config.js';
import { log } from 'node:console';
import { fileURLToPath, pathToFileURL } from 'node:url';

// This method is called when your extension is activated
export async function activate(context: vscode.ExtensionContext) {
  const { extension, parse, tags, views } = await getInitOptions();
  const { opening, closing } = tags;
  const { exec, interpolate, raw } = parse;
  const openingWithEvaluation = opening + exec;
  const closingWithEvaluation = closing + exec;
  const openingAndClosingEvaluated = `${openingWithEvaluation} ${closingWithEvaluation}`;

  const openingWithInterpolate = opening + interpolate;
  const openingAndClosingInterpolated = `${openingWithInterpolate} ${closing}`;

  const openingWithRaw = opening + raw;
  const openingAndClosingRaw = `${openingWithRaw} ${closing}`;

  const tagsProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const text = getLineTextUntilPosition(document, position);

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
        evalItem.insertText = new vscode.SnippetString(
          openingWithEvaluation + ' ${1} ' + closingWithEvaluation
        );
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

  const fileLinkProvider = vscode.languages.registerDefinitionProvider([extension], {
    provideDefinition(document, position) {
      const wordRange = document.getWordRangeAtPosition(position, /"([^"]+)"/);
      if (!wordRange) return;

      const word = document.getText(wordRange).replace(/['"]/g, '');
      log(word);

      const reference = findTemplateAccordingToTheNameClicked(completeTemplatesReferences, word);

      log(reference);
      if (!reference) return undefined;

      const filePath = pathToFileURL(reference).href;

      // +test
      return new vscode.Location(vscode.Uri.file(filePath), new vscode.Position(0, 0));
    },
  });

  context.subscriptions.push(
    includeProvider,
    tagsProvider,
    signatureProvider,
    templatesNameProvider,
    fileLinkProvider
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

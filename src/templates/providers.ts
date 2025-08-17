import * as vscode from 'vscode';
import { InitValues } from '../interfaces.js';
import {
  excludeCurrentFileFromTemplatePropositions,
  completeTemplatesPath,
  transformTemplatesNamesToCompletionItems,
  findTemplateAccordingToTheNameClicked,
  getTemplateNameFromTemplateInclude,
} from './helpers.js';
import { log } from 'node:console';
import { isInFirstIncludeArgument } from '../include/helpers.js';

function getTemplatesNameProvider(values: InitValues) {
  const { extension } = values;

  const templatesNameProvider = vscode.languages.registerCompletionItemProvider(
    { language: extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        if (!isInFirstIncludeArgument(document, position)) return undefined;
        const templates = excludeCurrentFileFromTemplatePropositions(
          completeTemplatesPath,
          document.fileName
        );

        const remainingTemplates = transformTemplatesNamesToCompletionItems(templates);

        return remainingTemplates;
      },
    },
    '"',
    "'",
    '`'
  );

  return templatesNameProvider;
}

function getTemplateLinkProvider(values: InitValues) {
  const { extension } = values;

  const templateLinkProvider = vscode.languages.registerDefinitionProvider([extension], {
    provideDefinition(document, position) {
      const word = getTemplateNameFromTemplateInclude(document, position);
      if (!word) return;

      const completeTemplatePath = findTemplateAccordingToTheNameClicked(
        completeTemplatesPath,
        word
      );

      log('word: ', word, 'and reference : ', completeTemplatePath);
      if (!completeTemplatePath) return;

      return new vscode.Location(vscode.Uri.file(completeTemplatePath), new vscode.Position(0, 0));
    },
  });

  return templateLinkProvider;
}

function getHoverProvider(values: InitValues) {
  const { extension } = values;

  const hoverProvider = vscode.languages.registerHoverProvider(extension, {
    provideHover(document, position) {
      const word = getTemplateNameFromTemplateInclude(document, position);
      if (!word) return;

      const template = completeTemplatesPath.find((template) => template.endsWith(word));

      if (!template) return;

      return new vscode.Hover(
        new vscode.MarkdownString(
          `Child template included in this template.  \n\n📂 Location: \`${template}\``
        )
      );
    },
  });

  return hoverProvider;
}

export { getTemplatesNameProvider, getTemplateLinkProvider, getHoverProvider };

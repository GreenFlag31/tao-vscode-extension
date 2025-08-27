import * as vscode from 'vscode';
import {
  excludeCurrentFileFromTemplatePropositions,
  completeTemplatesPath,
  transformTemplatesNamesToCompletionItems,
  findTemplateAccordingToTheNameClicked,
  getTemplateNameFromTemplateInclude,
} from './helpers.js';
import { log } from 'node:console';
import { isInFirstIncludeArgument } from '../include/helpers.js';
import { values } from '../config/init-config.js';

function getTemplatesNameProvider() {
  const templatesNameProvider = vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
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

function getTemplateLinkProvider() {
  const templateLinkProvider = vscode.languages.registerDefinitionProvider(values.extension, {
    provideDefinition(document, position) {
      const word = getTemplateNameFromTemplateInclude(document, position);
      if (!word) return;

      const completeTemplatePath = findTemplateAccordingToTheNameClicked(
        completeTemplatesPath,
        word
      );

      if (!completeTemplatePath) return;

      return new vscode.Location(vscode.Uri.file(completeTemplatePath), new vscode.Position(0, 0));
    },
  });

  return templateLinkProvider;
}

function getHoverProvider() {
  const hoverProvider = vscode.languages.registerHoverProvider(values.extension, {
    provideHover(document, position) {
      const word = getTemplateNameFromTemplateInclude(document, position);
      if (!word) return;

      const template = completeTemplatesPath.find((template) => template.endsWith(word));

      if (!template) return;

      return new vscode.Hover(
        new vscode.MarkdownString(
          `Child template included in this template.  \n\n Location: \`${template}\``
        )
      );
    },
  });

  return hoverProvider;
}

export { getTemplatesNameProvider, getTemplateLinkProvider, getHoverProvider };

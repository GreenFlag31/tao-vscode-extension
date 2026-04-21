import * as vscode from 'vscode';
import { getFileName, getLineTextUntilPosition } from '../utils.js';
import { values } from '../config/init-config.js';

let completeTemplatesPath: string[] = [];

const templateDiagnosticCollection = vscode.languages.createDiagnosticCollection('tao-templates');

function createTemplatesFilesWatcher() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;

  const templatesFilesWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(folder, `**/${values.views}/**/*.${values.extension}`),
  );

  templatesFilesWatcher.onDidCreate(getTemplatesFiles);
  // templatesFilesWatcher.onDidChange(getTemplatesFiles);
  templatesFilesWatcher.onDidDelete(getTemplatesFiles);

  return templatesFilesWatcher;
}

async function getTemplatesFiles() {
  const templates = await vscode.workspace.findFiles(
    `**/${values.views}/**/*.${values.extension}`,
    '**/node_modules/**',
  );

  completeTemplatesPath = templates.map((template) => template.path);
}

function excludeCurrentFileFromTemplatePropositions(
  completeTemplatesPath: string[],
  currentFile: string,
) {
  const fileName = getFileName(currentFile);

  const allOthersTemplates = completeTemplatesPath
    .map((template) => getFileName(template))
    .filter((template) => template !== fileName);

  return allOthersTemplates;
}

function transformTemplatesNamesToCompletionItems(templates: string[]) {
  const completionTemplateItems: vscode.CompletionItem[] = [];

  for (const template of templates) {
    const item = new vscode.CompletionItem(template, vscode.CompletionItemKind.File);
    item.insertText = template;
    item.detail = ' available template';
    item.documentation = 'TAO';
    completionTemplateItems.push(item);
  }

  return completionTemplateItems;
}

function validateTemplateNameInsideIncludes(document: vscode.TextDocument) {
  const text = document.getText();
  const diagnostics: vscode.Diagnostic[] = [];

  const INCLUDE_TEMPLATE_RE = /include\(\s*(['"`])([^'"`\n]+)\1/dg;
  let match: RegExpExecArray | null;

  while ((match = INCLUDE_TEMPLATE_RE.exec(text)) !== null) {
    const templateName = match[2];
    const existingTemplate = findTemplateAccordingToTheNameClicked(templateName);
    const templateWithExtension = getTemplateNameWithExtension(templateName);
    const autoInclusion = templateWithExtension === getFileName(document.fileName);

    if (existingTemplate && !autoInclusion) continue;

    const startAndEndIndices = match.indices?.[2];
    if (!startAndEndIndices) continue;

    const [start, end] = startAndEndIndices;
    const range = new vscode.Range(document.positionAt(start), document.positionAt(end));
    const diagnostic = new vscode.Diagnostic(
      range,
      autoInclusion
        ? `Cannot include template "${templateName}" in itself`
        : `Template "${templateName}" not found`,
      vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = 'tao';
    diagnostics.push(diagnostic);
  }

  templateDiagnosticCollection.set(document.uri, diagnostics);
}

function findTemplateAccordingToTheNameClicked(template: string) {
  const templateWithExtension = getTemplateNameWithExtension(template);

  const getTemplatePath = completeTemplatesPath.find((path) =>
    path.endsWith(templateWithExtension),
  );

  return getTemplatePath;
}

function getTemplateNameWithExtension(template: string) {
  const templateWithoutExtension = template.replace(new RegExp(`\\.${values.extension}$`), '');
  return `${templateWithoutExtension}.${values.extension}`;
}

function getTemplateNameFromTemplateInclude(
  document: vscode.TextDocument,
  position: vscode.Position,
) {
  const textBefore = getLineTextUntilPosition(document, position);
  if (!/include\(\s*["'`][^"'`]*$/.test(textBefore)) return '';

  const wordRange = document.getWordRangeAtPosition(position, /["'`]([^"'`]+)["'`]/);
  const word = document.getText(wordRange).replace(/['"`]/g, '');

  return word;
}

export {
  excludeCurrentFileFromTemplatePropositions,
  getTemplatesFiles,
  createTemplatesFilesWatcher,
  completeTemplatesPath,
  transformTemplatesNamesToCompletionItems,
  getTemplateNameFromTemplateInclude,
  findTemplateAccordingToTheNameClicked,
  validateTemplateNameInsideIncludes,
  templateDiagnosticCollection,
};

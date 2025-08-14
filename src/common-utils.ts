import { log } from 'console';
import * as vscode from 'vscode';

// include function ends naturally with a ')'
// template name can contain any character
const INCLUDE = /include\(['"]?.*['"]?.*,?/;
const COMPLETE_INCLUDE = /include\(['"]?.*['"]?.*[^)]?$/;

function getLineTextUntilPosition(document: vscode.TextDocument, position: vscode.Position) {
  const lineText = document.lineAt(position.line).text;
  const textBeforeCursor = lineText.substring(0, position.character);

  return textBeforeCursor;
}

function findTemplateAccordingToTheNameClicked(
  completeTemplatesReferences: string[],
  word: string
) {
  const getTemplateReference = completeTemplatesReferences.find((reference) =>
    reference.endsWith(word)
  );

  return getTemplateReference;
}

export {
  getLineTextUntilPosition,
  INCLUDE,
  COMPLETE_INCLUDE,
  findTemplateAccordingToTheNameClicked,
};

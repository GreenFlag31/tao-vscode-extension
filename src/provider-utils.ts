import * as vscode from 'vscode';

export interface CompletionItemData {
  name: string;
  label: {
    label: string;
    detail: string;
    description: string;
  };
  insertText: string;
  documentation: string | vscode.MarkdownString;
}

function createCompletionItemForSyntaxInTemplate(data: CompletionItemData) {
  const { insertText, documentation, name, label } = data;

  const ifWithTags = new vscode.CompletionItem(name, vscode.CompletionItemKind.Snippet);

  ifWithTags.label = label;
  ifWithTags.insertText = new vscode.SnippetString(insertText);
  ifWithTags.documentation = documentation;

  return [ifWithTags];
}

export { createCompletionItemForSyntaxInTemplate };

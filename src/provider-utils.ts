import * as vscode from 'vscode';

export interface CompletionItemSnippetData {
  name: string;
  label: {
    label: string;
    detail: string;
    description: string;
  };
  insertText: string;
  documentation: string | vscode.MarkdownString;
  range?: vscode.Range;
  itemKind: ItemKind;
}

export type ItemKind =
  | vscode.CompletionItemKind.Snippet
  | vscode.CompletionItemKind.Function
  | vscode.CompletionItemKind.Variable;

function createCompletionItemSnippet(...completionItems: CompletionItemSnippetData[]) {
  const itemsCollection: vscode.CompletionItem[] = [];

  for (const completionItem of completionItems) {
    const { insertText, documentation, name, label, range, itemKind } = completionItem;

    const newCompletionItem = new vscode.CompletionItem(name, itemKind);
    newCompletionItem.label = label;
    newCompletionItem.insertText = new vscode.SnippetString(insertText);
    newCompletionItem.documentation = documentation;
    newCompletionItem.range = range;

    itemsCollection.push(newCompletionItem);
  }

  return itemsCollection;
}

export { createCompletionItemSnippet };

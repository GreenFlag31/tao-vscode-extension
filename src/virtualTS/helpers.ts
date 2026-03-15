import { log } from 'console';
import * as vscode from 'vscode';
import { Project } from 'ts-morph';
import path from 'path';
import { values } from '../config/init-config.js';
import { normalizeWindowsPath } from '../utils.js';
import { getTemplateTokens } from '../lexer/store.js';
import { generateVirtualTs } from './virtual.js';
import { typeCheck, updateVirtualTs, languageService, getVirtualFileName } from './checker.js';
import ts from 'typescript';
import { TemplateError, TsMapping } from './interfaces.js';
import { TemplateData } from '../lexer/interfaces.js';

const tsDiagnosticCollection = vscode.languages.createDiagnosticCollection(); // 'tao-typescript'
const documentState = new Map<
  string,
  { tokens: TemplateData[]; virtualTsMappings: TsMapping[]; virtualTs: string }
>();
const tsconfigPath = path.join(getWorkspaceFolder(), 'tsconfig.json');

const project = new Project({
  tsConfigFilePath: tsconfigPath || undefined,
});

function getWorkspaceFolder() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? process.cwd();
  return workspaceFolder;
}

async function getTypescriptFiles() {
  const templates = await vscode.workspace.findFiles(`**/*.ts`, '**/node_modules/**');

  // fsPath gives the real Windows path (e.g. D:\...)
  return templates.map((template) => template.fsPath);
}

async function handleTypescript(document: vscode.TextDocument | undefined) {
  if (!document || !document.fileName.endsWith(`.${values.extension}`)) {
    return;
  }

  const { interfaceName, absoluteInterfacePath } = await extractTemplateInterfacesFromRender(
    document.fileName,
  );

  if (!absoluteInterfacePath) return;

  // logger(
  //   'warn',
  //   `Processing template ${document.fileName} with interface ${interfaceName} from ${absoluteInterfacePath}`,
  // );

  const templateTokens = getTemplateTokens(document);

  const { virtualTs, virtualTsMappings } = generateVirtualTs(
    templateTokens,
    absoluteInterfacePath,
    interfaceName,
  );
  // logger('warn', `Generated Virtual TS: ${virtualTs}\n`);

  const diagnostics = typeCheck(virtualTs);

  const tsTemplateErrors = mapDiagnosticsToTemplate(
    diagnostics,
    templateTokens,
    virtualTsMappings,
    document.getText(),
  );
  // log('Mapped Template Errors:', tsTemplateErrors);

  const vsDiagnostics = tsTemplateErrors.map((err) => {
    const start = document.positionAt(err.startPos);
    const end = document.positionAt(err.endPos);
    const range = new vscode.Range(start, end);
    return new vscode.Diagnostic(range, err.message, vscode.DiagnosticSeverity.Error);
  });

  tsDiagnosticCollection.set(document.uri, vsDiagnostics);

  documentState.set(document.uri.toString(), {
    tokens: templateTokens,
    virtualTsMappings,
    virtualTs,
  });
}

/**
 * Finds the interface used in render<T> for a given template file.
 * @param fileName - the template file name to match
 * @returns The absolute file path of the interface used in render<T> for the given template
 */
async function extractTemplateInterfacesFromRender(fileName: string) {
  const typescriptFiles = await getTypescriptFiles();

  let interfaceName = '';
  let filePathOfInterfaceUsed = '';

  for (const tsFilePath of typescriptFiles) {
    const renderCallRegex = /\.render\s*<\s*([A-Za-z0-9_]*)\s*>\(['"`]([^'"`]+)['"`]/g;
    const uri = vscode.Uri.file(tsFilePath);
    const bytes = await vscode.workspace.fs.readFile(uri);
    const content = new TextDecoder().decode(bytes);
    let match: RegExpExecArray | null;

    while ((match = renderCallRegex.exec(content)) !== null) {
      const [, interfaceDef, templateName] = match;
      const templateNameWithExtension = `${templateName}.${values.extension}`;

      if (fileName.endsWith(templateNameWithExtension)) {
        interfaceName = interfaceDef;
        filePathOfInterfaceUsed = tsFilePath;
        break;
      }
    }
  }

  if (!interfaceName) {
    log(`No interface found in render calls for template ${fileName}`);
    return { interfaceName: null, absoluteInterfacePath: null };
  }

  // logger('warn', `Interface ${interfaceName} found for template ${fileName}`);

  const absoluteInterfacePath = resolveInterface(filePathOfInterfaceUsed, interfaceName);

  return { interfaceName, absoluteInterfacePath };
}

/**
 * Resolves the absolute file path where the given interface is defined
 * Returns the absolute fsPath of the file containing the interface definition
 */
function resolveInterface(filePath: string, interfaceName: string) {
  let sourceFile = project.getSourceFile(filePath);

  if (!sourceFile) {
    sourceFile = project.addSourceFileAtPathIfExists(filePath);
  }

  if (!sourceFile) return null;

  const localInterface = sourceFile.getInterface(interfaceName);

  if (localInterface) return filePath;

  for (const imp of sourceFile.getImportDeclarations()) {
    const namedImports = imp.getNamedImports();

    for (const spec of namedImports) {
      if (spec.getName() === interfaceName) {
        const modulePath = imp.getModuleSpecifierValue();
        const dir = path.dirname(filePath);
        const resolvedBase = path.resolve(dir, modulePath);

        if (resolvedBase) return resolvedBase;
      }
    }
  }

  return null;
}

/**
 * Converts an absolute interface file path to a valid relative import path
 * suitable for use inside a virtual TS file located at `virtualTsFilePath`.
 */
function toImportPath(virtualTsFilePath: string, interfaceAbsPath: string): string {
  const virtualDir = path.dirname(virtualTsFilePath);
  // Remove .ts / .d.ts extension — TypeScript imports never include it
  const withoutExt = interfaceAbsPath.replace(/\.d\.ts$|\.ts$/, '');

  let relativePath = path.relative(virtualDir, withoutExt);
  let relativePathNormalized = normalizeWindowsPath(relativePath);

  // Ensure the path starts with ./ or ../
  if (!relativePathNormalized.startsWith('.')) {
    relativePathNormalized = `./${relativePathNormalized}`;
  }

  return relativePathNormalized;
}

function mapDiagnosticsToTemplate(
  diagnostics: readonly ts.Diagnostic[],
  expressions: TemplateData[],
  mappings: TsMapping[],
  rawTemplate: string,
) {
  const tsTemplateErrors: TemplateError[] = [];

  for (const diagnostic of diagnostics) {
    if (!diagnostic.start) continue;

    const mapping = mappings.find(
      (mapping) => diagnostic.start! >= mapping.tsStart && diagnostic.start! <= mapping.tsEnd,
    );

    if (!mapping) continue;

    const expr = expressions.find((expression) => expression.id === mapping.exprId)!;

    // log(diagnostic);
    // console.log(mapping);

    const { valueStart, valueEnd } = correctStartingOrEndingPositions(rawTemplate, expr);

    tsTemplateErrors.push({
      templateExpression: rawTemplate.slice(expr.startPos, expr.endPos),
      startPos: valueStart,
      endPos: valueEnd,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    });
  }

  return tsTemplateErrors;
}

function getTsHoverProvider() {
  return vscode.languages.registerHoverProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideHover(document, position) {
        const state = documentState.get(document.uri.toString());
        if (!state) return undefined;

        const { tokens, virtualTsMappings } = state;
        const hoverOffset = document.offsetAt(position);
        const rawTemplate = document.getText();

        const expr = tokens.find((t) => hoverOffset >= t.startPos && hoverOffset < t.endPos);
        if (!expr) return undefined;

        const mapping = virtualTsMappings.find((m) => m.exprId === expr.id);
        if (!mapping) return undefined;

        // Compute where the trimmed value actually starts in the raw template
        const { valueStart } = correctStartingOrEndingPositions(rawTemplate, expr);

        if (hoverOffset < valueStart || hoverOffset >= valueStart + expr.value.length) {
          return undefined;
        }

        const offsetInValue = hoverOffset - valueStart;
        const tsQueryPos = Math.min(mapping.tsStart + offsetInValue, mapping.tsEnd - 1);

        const quickInfo = languageService.getQuickInfoAtPosition(getVirtualFileName(), tsQueryPos);
        if (!quickInfo) return undefined;

        const displayText = quickInfo.displayParts?.map((p) => p.text).join('') ?? '';
        const docText = quickInfo.documentation?.map((p) => p.text).join('') ?? '';

        const markdown = new vscode.MarkdownString();
        markdown.appendCodeblock(displayText, 'typescript');
        if (docText) markdown.appendMarkdown(docText);

        return new vscode.Hover(markdown);
      },
    },
  );
}

function tsKindToVsKind(kind: string): vscode.CompletionItemKind {
  switch (kind) {
    case 'property':
      return vscode.CompletionItemKind.Property;
    case 'method':
      return vscode.CompletionItemKind.Method;
    case 'function':
      return vscode.CompletionItemKind.Function;
    case 'class':
      return vscode.CompletionItemKind.Class;
    case 'interface':
      return vscode.CompletionItemKind.Interface;
    case 'module':
      return vscode.CompletionItemKind.Module;
    case 'variable':
    case 'let':
      return vscode.CompletionItemKind.Variable;
    case 'const':
      return vscode.CompletionItemKind.Constant;
    case 'keyword':
      return vscode.CompletionItemKind.Keyword;
    default:
      return vscode.CompletionItemKind.Text;
  }
}

function getTsCompletionProvider() {
  return vscode.languages.registerCompletionItemProvider(
    { language: values.extension, scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const state = documentState.get(document.uri.toString());
        if (!state) return undefined;

        const rawTemplate = document.getText();
        const cursorOffset = document.offsetAt(position);
        const opening = values.opening;
        const closing = values.closing;

        // Scan backwards to find the nearest unclosed opening tag
        let tagStart = -1;
        for (let i = cursorOffset - 1; i >= Math.max(0, cursorOffset - 500); i--) {
          if (rawTemplate.startsWith(opening, i)) {
            const between = rawTemplate.slice(i + opening.length, cursorOffset);
            if (!between.includes(closing)) {
              tagStart = i;
              break;
            }
          }
        }
        if (tagStart === -1) return undefined;

        // Skip optional mode prefix char (= or ~) and leading whitespace
        let exprStart = tagStart + opening.length;
        const prefixChar = rawTemplate[exprStart];
        if (prefixChar === values.interpolate || prefixChar === values.raw) exprStart++;
        while (exprStart < cursorOffset && rawTemplate[exprStart] === ' ') exprStart++;

        const typedText = rawTemplate.slice(exprStart, cursorOffset);

        // Build a probe virtual TS: append ctx.TYPED_TEXT before the closing brace
        const { virtualTs } = state;
        const closingBrace = virtualTs.lastIndexOf('}');
        const probe = `${virtualTs.slice(0, closingBrace)}ctx.${typedText}\n}`;
        const queryPos = closingBrace + `ctx.${typedText}`.length;

        updateVirtualTs(probe);
        const completions = languageService.getCompletionsAtPosition(
          getVirtualFileName(),
          queryPos,
          undefined,
        );
        // Restore the original snapshot so diagnostics stay correct
        updateVirtualTs(virtualTs);

        if (!completions) return undefined;

        return completions.entries.map((entry) => {
          const item = new vscode.CompletionItem(entry.name, tsKindToVsKind(entry.kind));
          return item;
        });
      },
    },
    '.', // also trigger on dot for property chains
  );
}

/**
 * Adjusts the start and end positions of a template expression to exclude leading and trailing whitespace
 */
function correctStartingOrEndingPositions(rawTemplate: string, expr: TemplateData) {
  const rawSlice = rawTemplate.slice(expr.startPos, expr.endPos);

  const leadingWhitespace = rawSlice.length - rawSlice.trimStart().length;
  const valueStart = expr.startPos + leadingWhitespace;

  const trailingWhitespace = rawSlice.length - rawSlice.trimEnd().length;
  const valueEnd = expr.endPos - trailingWhitespace;

  return { valueStart, valueEnd };
}

export {
  getTypescriptFiles,
  extractTemplateInterfacesFromRender,
  handleTypescript,
  toImportPath,
  getWorkspaceFolder,
  tsDiagnosticCollection,
  getTsHoverProvider,
  getTsCompletionProvider,
};

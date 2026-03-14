import { log } from 'console';
import * as vscode from 'vscode';
import { Project } from 'ts-morph';
import path from 'path';
import { values } from '../config/init-config.js';
import { logger } from '../utils.js';
import { getTemplateTokens } from '../lexer/store.js';
import { generateVirtualTs } from './virtual.js';
import { typeCheck } from './checker.js';
import ts from 'typescript';
import { TemplateError, TsMapping } from './interfaces.js';
import { TemplateData } from '../lexer/interfaces.js';

function getWorkspaceFolder() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? process.cwd();
  return workspaceFolder;
}

const workspaceFolder = getWorkspaceFolder();
const tsconfigPath = path.join(workspaceFolder, 'tsconfig.json');

const project = new Project({
  tsConfigFilePath: tsconfigPath || undefined,
});

async function getTypescriptFiles() {
  const templates = await vscode.workspace.findFiles(`**/*.ts`, '**/node_modules/**');

  // fsPath gives the real Windows path (e.g. D:\...) — .path gives a URI path (/D:/...) which breaks ts-morph lookups
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
  const { virtualTs, mappings } = generateVirtualTs(
    templateTokens,
    absoluteInterfacePath,
    interfaceName,
  );
  logger('warn', `Generated Virtual TS: ${virtualTs}\n`);

  const diagnostics = typeCheck(virtualTs);

  mapDiagnosticsToTemplate(diagnostics, templateTokens, mappings, document.getText());
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
 * Resolves the absolute file path where the given interface is defined,
 * following import chains recursively if needed.
 * Returns the absolute fsPath of the file containing the interface definition, or null.
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
  logger('warn', `Resolving import path from ${virtualTsFilePath} to ${interfaceAbsPath}`);

  const virtualDir = path.dirname(virtualTsFilePath);
  // Remove .ts / .d.ts extension — TypeScript imports never include it
  const withoutExt = interfaceAbsPath.replace(/\.d\.ts$|\.ts$/, '');

  let rel = path.relative(virtualDir, withoutExt);
  // Normalize to forward slashes (required on Windows)
  rel = rel.replace(/\\/g, '/');
  // Ensure the path starts with ./ or ../
  if (!rel.startsWith('.')) rel = `./${rel}`;

  return rel;
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

    const expr = expressions.find((expression) => expression.id === mapping.exprId);

    // log(diagnostic);
    // console.log(mapping);
    // console.log('❌ Error:', ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    // console.log(
    //   '➡ Template range:',
    //   expr?.startPos,
    //   '→',
    //   expr?.endPos,
    //   `"${rawTemplate.slice(expr?.startPos, expr?.endPos)}"`,
    // );

    tsTemplateErrors.push({
      templateExpression: rawTemplate.slice(expr?.startPos, expr?.endPos),
      startPos: expr?.startPos ?? null,
      endPos: expr?.endPos ?? null,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    });
  }

  log(tsTemplateErrors);
  return tsTemplateErrors;
}

export {
  getTypescriptFiles,
  extractTemplateInterfacesFromRender,
  handleTypescript,
  toImportPath,
  getWorkspaceFolder,
};
